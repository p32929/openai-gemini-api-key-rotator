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
    this.server = null;
    this.adminSessionToken = null;
    this.fileLoggingEnabled = this.getFileLoggingStatus();
    this.logBuffer = [];
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
      if (this.config.hasGeminiKeys()) {
        console.log(`Available Gemini API keys: ${this.config.getGeminiApiKeys().length}`);
        console.log('Gemini endpoints: /gemini/v1/* and /gemini/v1beta/*');
      }
      if (this.config.hasOpenaiKeys()) {
        console.log(`Available OpenAI API keys: ${this.config.getOpenaiApiKeys().length}`);
        console.log('OpenAI endpoints: /openai/v1/*');
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
    
    // Only log to file for API calls, always log to console
    const isApiCall = this.parseRoute(req.url) !== null;
    console.log(`[REQ-${requestId}] ${req.method} ${req.url} from ${clientIp}`);
    if (isApiCall) {
      this.logApiRequest(`[REQ-${requestId}] ${req.method} ${req.url} from ${clientIp}`);
    }
    
    try {
      const body = await this.readRequestBody(req);
      
      // Handle admin routes
      if (req.url.startsWith('/admin')) {
        await this.handleAdminRequest(req, res, body);
        return;
      }
      
      const routeInfo = this.parseRoute(req.url);
      
      if (!routeInfo) {
        console.log(`[REQ-${requestId}] Invalid path: ${req.url}`);
        console.log(`[REQ-${requestId}] Response: 400 Bad Request - Invalid API path`);
        this.sendError(res, 400, 'Invalid API path. Use /gemini/v1/* or /openai/v1/*');
        return;
      }

      const { apiType, path } = routeInfo;
      console.log(`[REQ-${requestId}] Proxying to ${apiType.toUpperCase()}: ${path}`);
      this.logApiRequest(`[REQ-${requestId}] Proxying to ${apiType.toUpperCase()}: ${path}`);
      
      const headers = this.extractRelevantHeaders(req.headers, apiType);
      let response;
      
      if (apiType === 'gemini') {
        if (!this.geminiClient) {
          console.log(`[REQ-${requestId}] Response: 503 Service Unavailable - Gemini API not configured`);
          this.logApiRequest(`[REQ-${requestId}] Response: 503 Service Unavailable - Gemini API not configured`);
          this.sendError(res, 503, 'Gemini API not configured');
          return;
        }
        response = await this.geminiClient.makeRequest(req.method, path, body, headers);
      } else if (apiType === 'openai') {
        if (!this.openaiClient) {
          console.log(`[REQ-${requestId}] Response: 503 Service Unavailable - OpenAI API not configured`);
          this.logApiRequest(`[REQ-${requestId}] Response: 503 Service Unavailable - OpenAI API not configured`);
          this.sendError(res, 503, 'OpenAI API not configured');
          return;
        }
        response = await this.openaiClient.makeRequest(req.method, path, body, headers);
      }
      
      this.logApiResponse(requestId, response, body);
      this.sendResponse(res, response);
    } catch (error) {
      console.log(`[REQ-${requestId}] Request handling error: ${error.message}`);
      console.log(`[REQ-${requestId}] Response: 500 Internal Server Error`);
      if (isApiCall) {
        this.logApiRequest(`[REQ-${requestId}] Request handling error: ${error.message}`);
        this.logApiRequest(`[REQ-${requestId}] Response: 500 Internal Server Error`);
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
    
    // Gemini routes: /gemini/v1/* or /gemini/v1beta/*
    if (path.startsWith('/gemini/')) {
      const geminiPath = path.substring(7); // Remove '/gemini'
      if (geminiPath.startsWith('/v1/') || geminiPath.startsWith('/v1beta/')) {
        return {
          apiType: 'gemini',
          path: geminiPath + urlObj.search
        };
      }
    }
    
    // OpenAI routes: /openai/v1/*
    if (path.startsWith('/openai/')) {
      const openaiPath = path.substring(7); // Remove '/openai'
      if (openaiPath.startsWith('/v1/')) {
        return {
          apiType: 'openai',
          path: openaiPath + urlObj.search
        };
      }
    }
    
    return null;
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
    
    // Log basic response info (both console and file)
    const responseMsg = `[REQ-${requestId}] Response: ${response.statusCode} ${this.getStatusText(response.statusCode)}`;
    const contentMsg = `[REQ-${requestId}] Content-Type: ${contentType}, Size: ${contentLength} bytes`;
    
    console.log(responseMsg);
    console.log(contentMsg);
    this.logApiRequest(responseMsg);
    this.logApiRequest(contentMsg);
    
    // For error responses, log the error details
    if (response.statusCode >= 400) {
      try {
        const errorData = JSON.parse(response.data);
        if (errorData.error) {
          const errorMsg = `[REQ-${requestId}] Error: ${errorData.error.message || errorData.error.code || 'Unknown error'}`;
          console.log(errorMsg);
          this.logApiRequest(errorMsg);
        }
      } catch (e) {
        // If response is not JSON, log first 200 chars of response
        const errorText = response.data ? response.data.toString().substring(0, 200) : 'No error details';
        const errorMsg = `[REQ-${requestId}] Error details: ${errorText}`;
        console.log(errorMsg);
        this.logApiRequest(errorMsg);
      }
    }
    
    // For successful responses, log basic success info
    if (response.statusCode >= 200 && response.statusCode < 300) {
      const successMsg = `[REQ-${requestId}] Request completed successfully`;
      console.log(successMsg);
      this.logApiRequest(successMsg);
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
    } else if (path === '/admin/api/logging' && req.method === 'POST') {
      await this.handleToggleLogging(res, body);
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
  
  getFileLoggingStatus() {
    try {
      const envPath = path.join(process.cwd(), '.env');
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = this.config.parseEnvFile(envContent);
      return envVars.FILE_LOGGING === 'true';
    } catch (error) {
      return false;
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
      
      // Update file logging status if it changed
      if (finalEnvVars.FILE_LOGGING !== undefined) {
        this.fileLoggingEnabled = finalEnvVars.FILE_LOGGING === 'true';
      }
      
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
      const { apiType, apiKey } = JSON.parse(body);
      let testResult = { success: false, error: 'Unknown API type' };
      
      if (apiType === 'gemini') {
        // Test Gemini API key
        testResult = await this.testGeminiKey(apiKey);
      } else if (apiType === 'openai') {
        // Test OpenAI API key  
        testResult = await this.testOpenaiKey(apiKey);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(testResult));
    } catch (error) {
      this.sendError(res, 500, 'Failed to test API key');
    }
  }
  
  async testGeminiKey(apiKey) {
    const testId = Math.random().toString(36).substring(2, 11);
    const url = `${this.config.getGeminiBaseUrl()}/v1/models?key=${apiKey}`;
    
    try {
      const testResponse = await fetch(url);
      const responseText = await testResponse.text();
      const contentType = testResponse.headers.get('content-type') || 'unknown';
      
      // Single line log with compact info and response ID
      const logMsg = `[TEST-${testId}] GET /v1/models (Gemini) → ${testResponse.status} ${testResponse.statusText} | ${contentType} ${responseText.length}b`;
      
      // Store response data for viewing
      this.storeResponseData(testId, {
        method: 'GET',
        endpoint: '/v1/models',
        apiType: 'Gemini',
        status: testResponse.status,
        statusText: testResponse.statusText,
        contentType: contentType,
        responseData: responseText,
        requestBody: null // GET requests don't have body
      });
      
      console.log(logMsg);
      this.logApiRequest(logMsg);
      
      return { 
        success: testResponse.ok, 
        error: testResponse.ok ? null : 'Invalid API key or network error' 
      };
    } catch (error) {
      const logMsg = `[TEST-${testId}] GET /v1/models (Gemini) → ERROR: ${error.message}`;
      console.log(logMsg);
      this.logApiRequest(logMsg);
      return { success: false, error: error.message };
    }
  }
  
  async testOpenaiKey(apiKey) {
    const testId = Math.random().toString(36).substring(2, 11);
    const url = `${this.config.getOpenaiBaseUrl()}/v1/models`;
    
    try {
      const testResponse = await fetch(url, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      const responseText = await testResponse.text();
      const contentType = testResponse.headers.get('content-type') || 'unknown';
      
      // Single line log with compact info and response ID
      const logMsg = `[TEST-${testId}] GET /v1/models (OpenAI) → ${testResponse.status} ${testResponse.statusText} | ${contentType} ${responseText.length}b`;
      
      // Store response data for viewing
      this.storeResponseData(testId, {
        method: 'GET',
        endpoint: '/v1/models',
        apiType: 'OpenAI',
        status: testResponse.status,
        statusText: testResponse.statusText,
        contentType: contentType,
        responseData: responseText,
        requestBody: null // GET requests don't have body
      });
      
      console.log(logMsg);
      this.logApiRequest(logMsg);
      
      return { 
        success: testResponse.ok, 
        error: testResponse.ok ? null : 'Invalid API key or network error' 
      };
    } catch (error) {
      const logMsg = `[TEST-${testId}] GET /v1/models (OpenAI) → ERROR: ${error.message}`;
      console.log(logMsg);
      this.logApiRequest(logMsg);
      return { success: false, error: error.message };
    }
  }
  
  async handleGetLogs(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      logs: this.logBuffer,
      fileLoggingEnabled: this.fileLoggingEnabled 
    }));
  }
  
  async handleToggleLogging(res, body) {
    try {
      const { enabled } = JSON.parse(body);
      this.fileLoggingEnabled = enabled;
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, fileLoggingEnabled: this.fileLoggingEnabled }));
    } catch (error) {
      this.sendError(res, 500, 'Failed to toggle logging');
    }
  }
  
  logApiRequest(message) {
    if (this.fileLoggingEnabled) {
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} ${message}`;
      
      // Add to buffer (keep last 1000 entries)
      this.logBuffer.push(logEntry);
      if (this.logBuffer.length > 1000) {
        this.logBuffer.shift();
      }
      
      // Write to file
      const logPath = path.join(process.cwd(), 'proxy.log');
      fs.appendFileSync(logPath, logEntry + '\n');
    }
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
    
    // Reinitialize Gemini client if keys are available
    if (this.config.hasGeminiKeys()) {
      const geminiKeyRotator = new this.KeyRotator(this.config.getGeminiApiKeys(), 'gemini');
      this.geminiClient = new this.GeminiClient(geminiKeyRotator, this.config.getGeminiBaseUrl());
      console.log('[SERVER] Gemini client reinitialized');
    } else {
      this.geminiClient = null;
      console.log('[SERVER] Gemini client disabled (no keys available)');
    }
    
    // Reinitialize OpenAI client if keys are available
    if (this.config.hasOpenaiKeys()) {
      const openaiKeyRotator = new this.KeyRotator(this.config.getOpenaiApiKeys(), 'openai');
      this.openaiClient = new this.OpenAIClient(openaiKeyRotator, this.config.getOpenaiBaseUrl());
      console.log('[SERVER] OpenAI client reinitialized');
    } else {
      this.openaiClient = null;
      console.log('[SERVER] OpenAI client disabled (no keys available)');
    }
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = ProxyServer;