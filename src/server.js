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
    
    this.logRequest(`[REQ-${requestId}] ${req.method} ${req.url} from ${clientIp}`);
    
    try {
      const body = await this.readRequestBody(req);
      
      // Handle admin routes
      if (req.url.startsWith('/admin')) {
        await this.handleAdminRequest(req, res, body);
        return;
      }
      
      const routeInfo = this.parseRoute(req.url);
      
      if (!routeInfo) {
        this.logRequest(`[REQ-${requestId}] Invalid path: ${req.url}`);
        this.sendError(res, 400, 'Invalid API path. Use /gemini/v1/* or /openai/v1/*');
        return;
      }

      const { apiType, path } = routeInfo;
      this.logRequest(`[REQ-${requestId}] Proxying to ${apiType.toUpperCase()}: ${path}`);
      
      const headers = this.extractRelevantHeaders(req.headers, apiType);
      let response;
      
      if (apiType === 'gemini') {
        if (!this.geminiClient) {
          this.sendError(res, 503, 'Gemini API not configured');
          return;
        }
        response = await this.geminiClient.makeRequest(req.method, path, body, headers);
      } else if (apiType === 'openai') {
        if (!this.openaiClient) {
          this.sendError(res, 503, 'OpenAI API not configured');
          return;
        }
        response = await this.openaiClient.makeRequest(req.method, path, body, headers);
      }
      
      this.logRequest(`[REQ-${requestId}] Response: ${response.statusCode}`);
      this.sendResponse(res, response);
    } catch (error) {
      this.logRequest(`[REQ-${requestId}] Request handling error: ${error.message}`);
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
    try {
      const testResponse = await fetch(`${this.config.getGeminiBaseUrl()}/v1/models?key=${apiKey}`);
      return { 
        success: testResponse.ok, 
        error: testResponse.ok ? null : 'Invalid API key or network error' 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async testOpenaiKey(apiKey) {
    try {
      const testResponse = await fetch(`${this.config.getOpenaiBaseUrl()}/v1/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return { 
        success: testResponse.ok, 
        error: testResponse.ok ? null : 'Invalid API key or network error' 
      };
    } catch (error) {
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
  
  logRequest(message) {
    console.log(message);
    
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

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = ProxyServer;