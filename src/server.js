const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ProxyServer {
  constructor(config, geminiClient = null, openaiClient = null) {
    this.config = config;
    this.geminiClient = geminiClient;
    this.openaiClient = openaiClient;
    this.providerClients = new Map(); // Map of provider_name -> client instance
    this.server = null;
    this.adminSessionToken = null;
    this.logBuffer = []; // Store logs in RAM only (last 100 entries)
    this.responseStorage = new Map(); // Store response data for viewing
    
    // Store required classes for reinitialization
    this.KeyRotator = require('./keyRotator');
    this.GeminiClient = require('./geminiClient');
    this.OpenAIClient = require('./openaiClient');
  }

  start() {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(this.config.getPort(), () => {
      console.log(`Multi-API proxy server running on port ${this.config.getPort()}`);
      
      const providers = this.config.getProviders();
      for (const [providerName, config] of providers.entries()) {
        console.log(`Provider '${providerName}' (${config.apiType}): /${providerName}/v1/* → ${config.baseUrl}`);
      }
      
      // Backward compatibility logging
      if (this.config.hasGeminiKeys()) {
        console.log(`Legacy Gemini endpoints: /gemini/v1/* and /gemini/v1beta/*`);
      }
      if (this.config.hasOpenaiKeys()) {
        console.log(`Legacy OpenAI endpoints: /openai/v1/*`);
      }
      
      if (this.config.hasAdminPassword()) {
        console.log(`Admin panel available at: http://localhost:${this.config.getPort()}/admin`);
      }
    });

    this.server.on('error', (error) => {
      console.error('Server error:', error);
    });
  }

  async handleRequest(req, res) {
    const requestId = Math.random().toString(36).substring(2, 11);
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const startTime = Date.now();
    
    // Only log to file for API calls, always log to console
    const isApiCall = this.parseRoute(req.url) !== null;
    console.log(`[REQ-${requestId}] ${req.method} ${req.url} from ${clientIp}`);
    
    try {
      const body = await this.readRequestBody(req);
      
      // Handle admin routes
      if (req.url.startsWith('/admin')) {
        await this.handleAdminRequest(req, res, body);
        return;
      }
      
      // Handle common browser requests that aren't API calls
      if (req.url === '/favicon.ico' || req.url === '/robots.txt') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }
      
      const routeInfo = this.parseRoute(req.url);
      
      if (!routeInfo) {
        console.log(`[REQ-${requestId}] Invalid path: ${req.url}`);
        console.log(`[REQ-${requestId}] Response: 400 Bad Request - Invalid API path`);
        
        if (isApiCall) {
          const responseTime = Date.now() - startTime;
          this.logApiRequest(requestId, req.method, req.url, 'unknown', 400, responseTime, 'Invalid API path', clientIp);
        }
        
        this.sendError(res, 400, 'Invalid API path. Use /{provider}/v1/* format');
        return;
      }

      const { providerName, apiType, path, provider, legacy } = routeInfo;
      console.log(`[REQ-${requestId}] Proxying to provider '${providerName}' (${apiType.toUpperCase()}): ${path}`);
      
      // Log the initial request
      if (isApiCall) {
        this.logApiRequest(requestId, req.method, path, providerName, null, null, null, clientIp);
      }
      
      const headers = this.extractRelevantHeaders(req.headers, apiType);
      let response;
      
      // Get or create client for this provider
      const client = await this.getProviderClient(providerName, provider, legacy);
      if (!client) {
        console.log(`[REQ-${requestId}] Response: 503 Service Unavailable - Provider '${providerName}' not configured`);
        
        if (isApiCall) {
          const responseTime = Date.now() - startTime;
          this.logApiRequest(requestId, req.method, path, providerName, 503, responseTime, `Provider '${providerName}' not configured`, clientIp);
        }
        
        this.sendError(res, 503, `Provider '${providerName}' not configured`);
        return;
      }
      
      response = await client.makeRequest(req.method, path, body, headers);
      
      // Log the successful response
      if (isApiCall) {
        const responseTime = Date.now() - startTime;
        const error = response.statusCode >= 400 ? `HTTP ${response.statusCode}` : null;
        this.logApiRequest(requestId, req.method, path, providerName, response.statusCode, responseTime, error, clientIp);
      }
      
      this.logApiResponse(requestId, response, body);
      this.sendResponse(res, response);
    } catch (error) {
      console.log(`[REQ-${requestId}] Request handling error: ${error.message}`);
      console.log(`[REQ-${requestId}] Response: 500 Internal Server Error`);
      
      if (isApiCall) {
        const responseTime = Date.now() - startTime;
        this.logApiRequest(requestId, req.method, req.url, 'unknown', 500, responseTime, error.message, clientIp);
      }
      
      this.sendError(res, 500, 'Internal server error');
    }
  }

  readRequestBody(req) {
    return new Promise((resolve) => {
      let body = '';
      
      req.on('data', (chunk) => {
        body += chunk;
      });
      
      req.on('end', () => {
        resolve(body || null);
      });
    });
  }

  parseRoute(url) {
    if (!url) return null;
    
    const urlObj = new URL(url, 'http://localhost');
    const path = urlObj.pathname;
    
    // Parse new provider format: /{provider}/{version}/*
    const pathParts = path.split('/').filter(part => part.length > 0);
    if (pathParts.length >= 2) {
      const providerName = pathParts[0];
      const provider = this.config.getProvider(providerName);
      
      if (provider) {
        // Extract the API path after /{provider}/{version}
        const apiPath = '/' + pathParts.slice(1).join('/') + urlObj.search;
        
        return {
          providerName: providerName,
          apiType: provider.apiType,
          path: this.adjustProviderPath(apiPath, provider.baseUrl),
          provider: provider
        };
      }
    }
    
    // Backward compatibility - Legacy Gemini routes: /gemini/{version}/*
    if (path.startsWith('/gemini/')) {
      const geminiPath = path.substring(7); // Remove '/gemini'
      // Check if it starts with any version pattern (/vXXX/)
      if (geminiPath.match(/^\/v[^\/]+\//)) {
        // Check if base URL already includes version path
        const baseUrl = this.config.getGeminiBaseUrl();
        const baseUrlHasVersion = baseUrl.match(/\/v[^\/]+$/);
        
        return {
          providerName: 'gemini',
          apiType: 'gemini',
          // If base URL already has version, adjust path accordingly
          path: baseUrlHasVersion ? this.adjustGeminiPath(geminiPath, baseUrl) + urlObj.search : geminiPath + urlObj.search,
          legacy: true
        };
      }
    }
    
    // Backward compatibility - Legacy OpenAI routes: /openai/{version}/*
    if (path.startsWith('/openai/')) {
      const openaiPath = path.substring(7); // Remove '/openai'
      // Check if it starts with any version pattern (/vXXX/)
      if (openaiPath.match(/^\/v[^\/]+\//)) {
        // Check if base URL already includes version path
        const baseUrl = this.config.getOpenaiBaseUrl();
        const baseUrlHasVersion = baseUrl.match(/\/v[^\/]+$/);
        
        return {
          providerName: 'openai',
          apiType: 'openai',
          // If base URL already has version, remove it from the path to avoid duplication
          path: baseUrlHasVersion ? this.adjustOpenaiPath(openaiPath, baseUrl) + urlObj.search : openaiPath + urlObj.search,
          legacy: true
        };
      }
    }
    
    return null;
  }

  adjustProviderPath(apiPath, baseUrl) {
    // Simple path adjustment to avoid duplication
    // If the base URL already ends with the beginning of our path, remove the duplicate part
    
    if (apiPath.startsWith('/')) {
      // Find the longest common suffix of baseUrl and prefix of apiPath
      const pathParts = apiPath.split('/').filter(part => part.length > 0);
      
      for (let i = pathParts.length; i > 0; i--) {
        const pathPrefix = '/' + pathParts.slice(0, i).join('/');
        if (baseUrl.endsWith(pathPrefix)) {
          // Remove the duplicate part from the path
          return '/' + pathParts.slice(i).join('/');
        }
      }
    }
    
    return apiPath; // No adjustment needed
  }

  adjustGeminiPath(geminiPath, baseUrl) {
    // For Gemini, handle version path adjustments dynamically
    const baseVersionMatch = baseUrl.match(/\/v[^\/]+$/);
    const pathVersionMatch = geminiPath.match(/^\/v[^\/]+\//);
    
    if (baseVersionMatch && pathVersionMatch) {
      const baseVersion = baseVersionMatch[0];
      const pathVersion = pathVersionMatch[0].slice(0, -1); // Remove trailing /
      
      if (baseVersion === pathVersion) {
        return geminiPath.substring(pathVersion.length);
      }
    }
    
    return geminiPath; // No adjustment needed
  }

  adjustOpenaiPath(openaiPath, baseUrl) {
    // For OpenAI, handle version path adjustments dynamically
    const baseVersionMatch = baseUrl.match(/\/v[^\/]+$/);
    const pathVersionMatch = openaiPath.match(/^\/v[^\/]+\//);
    
    if (baseVersionMatch && pathVersionMatch) {
      const baseVersion = baseVersionMatch[0];
      const pathVersion = pathVersionMatch[0].slice(0, -1); // Remove trailing /
      
      if (baseVersion === pathVersion) {
        return openaiPath.substring(pathVersion.length);
      }
    }
    
    return openaiPath; // No adjustment needed
  }

  async getProviderClient(providerName, provider, legacy = false) {
    // Handle legacy clients
    if (legacy) {
      if (providerName === 'gemini' && this.geminiClient) {
        return this.geminiClient;
      }
      if (providerName === 'openai' && this.openaiClient) {
        return this.openaiClient;
      }
      return null;
    }

    // Check if we already have a client for this provider
    if (this.providerClients.has(providerName)) {
      return this.providerClients.get(providerName);
    }

    // Create new client for this provider
    if (!provider) {
      return null;
    }

    try {
      const keyRotator = new this.KeyRotator(provider.keys, provider.apiType);
      let client;

      if (provider.apiType === 'openai') {
        client = new this.OpenAIClient(keyRotator, provider.baseUrl);
      } else if (provider.apiType === 'gemini') {
        client = new this.GeminiClient(keyRotator, provider.baseUrl);
      } else {
        return null;
      }

      this.providerClients.set(providerName, client);
      console.log(`[SERVER] Created client for provider '${providerName}' (${provider.apiType})`);
      return client;
    } catch (error) {
      console.error(`[SERVER] Failed to create client for provider '${providerName}': ${error.message}`);
      return null;
    }
  }

  extractRelevantHeaders(headers, apiType) {
    const relevantHeaders = {};
    let headersToInclude;
    
    if (apiType === 'gemini') {
      headersToInclude = [
        'content-type',
        'accept',
        'user-agent',
        'x-goog-user-project'
      ];
    } else if (apiType === 'openai') {
      headersToInclude = [
        'content-type',
        'accept',
        'user-agent',
        'openai-organization',
        'openai-project'
      ];
    }
    
    for (const [key, value] of Object.entries(headers)) {
      if (headersToInclude.includes(key.toLowerCase())) {
        relevantHeaders[key] = value;
      }
    }
    
    return relevantHeaders;
  }

  sendResponse(res, response) {
    res.writeHead(response.statusCode, response.headers);
    res.end(response.data);
  }

  sendError(res, statusCode, message) {
    console.log(`[SERVER] Sending error response: ${statusCode} - ${message}`);
    
    const errorResponse = {
      error: {
        code: statusCode,
        message: message,
        status: statusCode === 400 ? 'INVALID_ARGUMENT' : 'INTERNAL'
      }
    };
    
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(errorResponse));
  }

  logApiResponse(requestId, response, requestBody = null) {
    const contentLength = response.headers['content-length'] || (response.data ? response.data.length : 0);
    const contentType = response.headers['content-type'] || 'unknown';
    
    // Store response data for viewing
    this.storeResponseData(requestId, {
      method: 'API_CALL',
      endpoint: 'proxied_request',
      apiType: 'LLM_API',
      status: response.statusCode,
      statusText: this.getStatusText(response.statusCode),
      contentType: contentType,
      responseData: response.data,
      requestBody: requestBody
    });
    
    // Log basic response info to console only (structured logging handled in handleRequest)
    const responseMsg = `[REQ-${requestId}] Response: ${response.statusCode} ${this.getStatusText(response.statusCode)}`;
    const contentMsg = `[REQ-${requestId}] Content-Type: ${contentType}, Size: ${contentLength} bytes`;
    
    console.log(responseMsg);
    console.log(contentMsg);
    
    // For error responses, log the error details to console
    if (response.statusCode >= 400) {
      try {
        const errorData = JSON.parse(response.data);
        if (errorData.error) {
          const errorMsg = `[REQ-${requestId}] Error: ${errorData.error.message || errorData.error.code || 'Unknown error'}`;
          console.log(errorMsg);
        }
      } catch (e) {
        // If response is not JSON, log first 200 chars of response
        const errorText = response.data ? response.data.toString().substring(0, 200) : 'No error details';
        const errorMsg = `[REQ-${requestId}] Error details: ${errorText}`;
        console.log(errorMsg);
      }
    }
    
    // For successful responses, log basic success info to console
    if (response.statusCode >= 200 && response.statusCode < 300) {
      const successMsg = `[REQ-${requestId}] Request completed successfully`;
      console.log(successMsg);
    }
  }

  getStatusText(statusCode) {
    const statusTexts = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };
    return statusTexts[statusCode] || 'Unknown Status';
  }

  async handleAdminRequest(req, res, body) {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    
    // Check if admin password is configured
    const adminPassword = this.getAdminPassword();
    if (!adminPassword) {
      this.sendError(res, 503, 'Admin panel not configured');
      return;
    }
    
    // Serve main admin page
    if (path === '/admin' || path === '/admin/') {
      this.serveAdminPanel(res);
      return;
    }
    
    // Check authentication status
    if (path === '/admin/api/auth' && req.method === 'GET') {
      const isAuthenticated = this.isAdminAuthenticated(req);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ authenticated: isAuthenticated }));
      return;
    }
    
    // Handle login
    if (path === '/admin/login' && req.method === 'POST') {
      await this.handleAdminLogin(req, res, body);
      return;
    }
    
    // Handle logout
    if (path === '/admin/logout' && req.method === 'POST') {
      this.adminSessionToken = null;
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Set-Cookie': 'adminSession=; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/admin'
      });
      res.end(JSON.stringify({ success: true }));
      return;
    }
    
    // All other admin routes require authentication
    if (!this.isAdminAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    
    // Admin API routes
    if (path === '/admin/api/env' && req.method === 'GET') {
      await this.handleGetEnvVars(res);
    } else if (path === '/admin/api/env' && req.method === 'POST') {
      await this.handleUpdateEnvVars(res, body);
    } else if (path === '/admin/api/test' && req.method === 'POST') {
      await this.handleTestApiKey(res, body);
    } else if (path === '/admin/api/logs' && req.method === 'GET') {
      await this.handleGetLogs(res);
    } else if (path.startsWith('/admin/api/response/') && req.method === 'GET') {
      await this.handleGetResponse(res, path);
    } else {
      this.sendError(res, 404, 'Not found');
    }
  }
  
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  parseCookies(cookieHeader) {
    const cookies = {};
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.trim().split('=');
        if (parts.length === 2) {
          cookies[parts[0]] = parts[1];
        }
      });
    }
    return cookies;
  }
  
  isAdminAuthenticated(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    return cookies.adminSession === this.adminSessionToken && this.adminSessionToken !== null;
  }

  async handleAdminLogin(req, res, body) {
    try {
      const data = JSON.parse(body);
      const adminPassword = this.getAdminPassword();
      if (data.password === adminPassword) {
        this.adminSessionToken = this.generateSessionToken();
        
        // Set session cookie (expires in 24 hours)
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Set-Cookie': `adminSession=${this.adminSessionToken}; HttpOnly; Expires=${expires}; Path=/admin`
        });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid password' }));
      }
    } catch (error) {
      this.sendError(res, 400, 'Invalid request');
    }
  }
  
  async handleGetEnvVars(res) {
    try {
      const envPath = path.join(process.cwd(), '.env');
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = this.config.parseEnvFile(envContent);
      
      // Don't send the admin password
      delete envVars.ADMIN_PASSWORD;
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(envVars));
    } catch (error) {
      this.sendError(res, 500, 'Failed to read environment variables');
    }
  }
  
  getAdminPassword() {
    try {
      const envPath = path.join(process.cwd(), '.env');
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = this.config.parseEnvFile(envContent);
      return envVars.ADMIN_PASSWORD;
    } catch (error) {
      return null;
    }
  }
  
  
  async handleUpdateEnvVars(res, body) {
    try {
      const envVars = JSON.parse(body);
      const envPath = path.join(process.cwd(), '.env');
      
      // Read current env to preserve admin password
      const currentEnvContent = fs.readFileSync(envPath, 'utf8');
      const currentEnvVars = this.config.parseEnvFile(currentEnvContent);
      
      // Merge with new vars but preserve admin password
      const finalEnvVars = { ...envVars };
      if (currentEnvVars.ADMIN_PASSWORD) {
        finalEnvVars.ADMIN_PASSWORD = currentEnvVars.ADMIN_PASSWORD;
      }
      
      // Write new env file - filter out empty values for BASE_URL
      const envContent = Object.entries(finalEnvVars)
        .filter(([key, value]) => {
          // Skip BASE_URL if it's empty or undefined
          if (key === 'BASE_URL' && (!value || value.trim() === '')) {
            return false;
          }
          return true;
        })
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      fs.writeFileSync(envPath, envContent);
      
      
      // Reload configuration
      this.config.loadConfig();
      
      // Reinitialize API clients with updated configuration
      this.reinitializeClients();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      this.sendError(res, 500, 'Failed to update environment variables');
    }
  }
  
  async handleTestApiKey(res, body) {
    try {
      const { apiType, apiKey, baseUrl } = JSON.parse(body);
      let testResult = { success: false, error: 'Unknown API type' };
      
      if (apiType === 'gemini') {
        // Test Gemini API key with custom base URL if provided
        testResult = await this.testGeminiKey(apiKey, baseUrl);
      } else if (apiType === 'openai') {
        // Test OpenAI API key with custom base URL if provided
        testResult = await this.testOpenaiKey(apiKey, baseUrl);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(testResult));
    } catch (error) {
      this.sendError(res, 500, 'Failed to test API key');
    }
  }
  
  async testGeminiKey(apiKey, baseUrl = null) {
    const testId = Math.random().toString(36).substring(2, 11);
    const testBaseUrl = baseUrl || 'https://generativelanguage.googleapis.com/v1';
    const startTime = Date.now();
    
    // Determine the correct path based on base URL
    let testPath = '/models';
    let fullUrl;
    
    if (testBaseUrl.includes('/v1') || testBaseUrl.includes('/v1beta')) {
      // Base URL already includes version, just append models
      fullUrl = `${testBaseUrl.endsWith('/') ? testBaseUrl.slice(0, -1) : testBaseUrl}/models?key=${apiKey}`;
    } else {
      // Base URL doesn't include version, add /v1/models
      fullUrl = `${testBaseUrl.endsWith('/') ? testBaseUrl.slice(0, -1) : testBaseUrl}/v1/models?key=${apiKey}`;
      testPath = '/v1/models';
    }
    
    try {
      const testResponse = await fetch(fullUrl);
      const responseText = await testResponse.text();
      const contentType = testResponse.headers.get('content-type') || 'unknown';
      const responseTime = Date.now() - startTime;
      
      // Store response data for viewing
      this.storeResponseData(testId, {
        method: 'GET',
        endpoint: testPath,
        apiType: 'Gemini',
        status: testResponse.status,
        statusText: testResponse.statusText,
        contentType: contentType,
        responseData: responseText,
        requestBody: null
      });
      
      // Log with structured format
      const error = !testResponse.ok ? `API test failed: ${testResponse.status} ${testResponse.statusText}` : null;
      this.logApiRequest(testId, 'GET', testPath, 'gemini', testResponse.status, responseTime, error, 'admin-test');
      
      console.log(`[TEST-${testId}] GET ${testPath} (Gemini) → ${testResponse.status} ${testResponse.statusText} | ${contentType} ${responseText.length}b`);
      
      return { 
        success: testResponse.ok, 
        error: error
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      console.log(`[TEST-${testId}] GET ${testPath} (Gemini) → ERROR: ${error.message}`);
      this.logApiRequest(testId, 'GET', testPath, 'gemini', null, responseTime, error.message, 'admin-test');
      
      return { success: false, error: error.message };
    }
  }
  
  async testOpenaiKey(apiKey, baseUrl = null) {
    const testId = Math.random().toString(36).substring(2, 11);
    const testBaseUrl = baseUrl || 'https://api.openai.com/v1';
    const startTime = Date.now();
    
    // Construct the full URL - just append /models to the base URL
    const fullUrl = `${testBaseUrl.endsWith('/') ? testBaseUrl.slice(0, -1) : testBaseUrl}/models`;
    
    // Determine display path for logging
    let testPath = '/models';
    if (testBaseUrl.includes('/openai/v1')) {
      testPath = '/openai/v1/models';
    } else if (testBaseUrl.includes('/v1')) {
      testPath = '/v1/models';
    }
    
    try {
      const testResponse = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      const responseText = await testResponse.text();
      const contentType = testResponse.headers.get('content-type') || 'unknown';
      const responseTime = Date.now() - startTime;
      
      // Store response data for viewing
      this.storeResponseData(testId, {
        method: 'GET',
        endpoint: testPath,
        apiType: 'OpenAI',
        status: testResponse.status,
        statusText: testResponse.statusText,
        contentType: contentType,
        responseData: responseText,
        requestBody: null
      });
      
      // Log with structured format
      const error = !testResponse.ok ? `API test failed: ${testResponse.status} ${testResponse.statusText}` : null;
      this.logApiRequest(testId, 'GET', testPath, 'openai', testResponse.status, responseTime, error, 'admin-test');
      
      console.log(`[TEST-${testId}] GET ${testPath} (OpenAI) → ${testResponse.status} ${testResponse.statusText} | ${contentType} ${responseText.length}b`);
      
      return { 
        success: testResponse.ok, 
        error: error
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      console.log(`[TEST-${testId}] GET ${testPath} (OpenAI) → ERROR: ${error.message}`);
      this.logApiRequest(testId, 'GET', testPath, 'openai', null, responseTime, error.message, 'admin-test');
      
      return { success: false, error: error.message };
    }
  }
  
  async handleGetLogs(res) {
    try {
      // Return logs from memory buffer only (last 100 entries)
      const recentLogs = this.logBuffer.slice(-100).map(log => {
        // Handle both old string format and new object format
        if (typeof log === 'string') {
          // Parse old string format: "2024-01-15T10:30:45.123Z [REQ-abc123] POST /endpoint"
          const match = log.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+(.*)$/);
          if (match) {
            return {
              timestamp: match[1],
              requestId: 'legacy',
              method: 'UNKNOWN',
              endpoint: 'unknown',
              provider: 'unknown',
              status: null,
              responseTime: null,
              error: null,
              clientIp: null,
              message: match[2] // Keep original message for backward compatibility
            };
          }
          return {
            timestamp: new Date().toISOString(),
            requestId: 'unknown',
            method: 'UNKNOWN',
            endpoint: 'unknown',
            provider: 'unknown',
            status: null,
            responseTime: null,
            error: null,
            clientIp: null,
            message: log
          };
        }
        return log; // Already an object
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        logs: recentLogs,
        totalEntries: recentLogs.length,
        format: 'json' // Indicate the new format
      }));
    } catch (error) {
      console.error('Failed to get logs:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Failed to retrieve logs',
        logs: []
      }));
    }
  }
  
  
  logApiRequest(requestId, method, endpoint, provider, status = null, responseTime = null, error = null, clientIp = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: requestId || 'unknown',
      method: method || 'UNKNOWN',
      endpoint: endpoint || 'unknown',
      provider: provider || 'unknown',
      status: status,
      responseTime: responseTime,
      error: error,
      clientIp: clientIp
    };
    
    // Add to buffer (keep last 100 entries in RAM only)
    this.logBuffer.push(logEntry);
    if (this.logBuffer.length > 100) {
      this.logBuffer.shift();
    }
  }

  
  // Helper method for backward compatibility - converts old string calls to new structured calls
  logApiRequestLegacy(message) {
    // Parse message to extract structured data
    const timestamp = new Date().toISOString();
    
    // Extract request ID if present
    const reqIdMatch = message.match(/\[REQ-([^\]]+)\]/);
    const requestId = reqIdMatch ? reqIdMatch[1] : 'unknown';
    
    // Extract method and endpoint
    const methodMatch = message.match(/(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)/);
    const method = methodMatch ? methodMatch[1] : 'UNKNOWN';
    const endpoint = methodMatch ? methodMatch[2] : 'unknown';
    
    // Extract provider
    let provider = 'unknown';
    if (message.includes('OpenAI')) provider = 'openai';
    else if (message.includes('Gemini')) provider = 'gemini';
    else if (message.includes('groq')) provider = 'groq';
    else if (message.includes('openrouter')) provider = 'openrouter';
    
    // Extract status code
    const statusMatch = message.match(/(\d{3})\s+/);
    const status = statusMatch ? parseInt(statusMatch[1]) : null;
    
    // Extract error information
    const error = message.includes('error') || message.includes('Error') || status >= 400 ? message : null;
    
    this.logApiRequest(requestId, method, endpoint, provider, status, null, error, null);
  }


  storeResponseData(testId, responseData) {
    // Store response data for viewing (keep last 100 responses)
    this.responseStorage.set(testId, responseData);
    if (this.responseStorage.size > 100) {
      const firstKey = this.responseStorage.keys().next().value;
      this.responseStorage.delete(firstKey);
    }
  }

  async handleGetResponse(res, path) {
    try {
      const testId = path.split('/').pop(); // Extract testId from path
      const responseData = this.responseStorage.get(testId);
      
      if (!responseData) {
        this.sendError(res, 404, 'Response not found');
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responseData));
    } catch (error) {
      this.sendError(res, 500, 'Failed to get response data');
    }
  }

  serveAdminPanel(res) {
    try {
      const htmlPath = path.join(process.cwd(), 'public', 'admin.html');
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (error) {
      this.sendError(res, 500, 'Admin panel not found');
    }
  }

  /**
   * Reinitialize API clients with updated configuration
   * Called after environment variables are updated via admin panel
   */
  reinitializeClients() {
    console.log('[SERVER] Reinitializing API clients with updated configuration...');
    
    // Clear all provider clients
    this.providerClients.clear();
    
    // Reinitialize legacy clients for backward compatibility
    if (this.config.hasGeminiKeys()) {
      const geminiKeyRotator = new this.KeyRotator(this.config.getGeminiApiKeys(), 'gemini');
      this.geminiClient = new this.GeminiClient(geminiKeyRotator, this.config.getGeminiBaseUrl());
      console.log('[SERVER] Legacy Gemini client reinitialized');
    } else {
      this.geminiClient = null;
      console.log('[SERVER] Legacy Gemini client disabled (no keys available)');
    }
    
    if (this.config.hasOpenaiKeys()) {
      const openaiKeyRotator = new this.KeyRotator(this.config.getOpenaiApiKeys(), 'openai');
      this.openaiClient = new this.OpenAIClient(openaiKeyRotator, this.config.getOpenaiBaseUrl());
      console.log('[SERVER] Legacy OpenAI client reinitialized');
    } else {
      this.openaiClient = null;
      console.log('[SERVER] Legacy OpenAI client disabled (no keys available)');
    }
    
    console.log(`[SERVER] ${this.config.getProviders().size} providers available for dynamic initialization`);
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = ProxyServer;