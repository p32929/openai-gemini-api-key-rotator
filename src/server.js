const http = require('http');
const { URL } = require('url');

class ProxyServer {
  constructor(config, geminiClient = null, openaiClient = null) {
    this.config = config;
    this.geminiClient = geminiClient;
    this.openaiClient = openaiClient;
    this.server = null;
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
    });

    this.server.on('error', (error) => {
      console.error('Server error:', error);
    });
  }

  async handleRequest(req, res) {
    const requestId = Math.random().toString(36).substring(2, 11);
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    console.log(`[REQ-${requestId}] ${req.method} ${req.url} from ${clientIp}`);
    
    try {
      const body = await this.readRequestBody(req);
      const routeInfo = this.parseRoute(req.url);
      
      if (!routeInfo) {
        console.log(`[REQ-${requestId}] Invalid path: ${req.url}`);
        this.sendError(res, 400, 'Invalid API path. Use /gemini/v1/* or /openai/v1/*');
        return;
      }

      const { apiType, path } = routeInfo;
      console.log(`[REQ-${requestId}] Proxying to ${apiType.toUpperCase()}: ${path}`);
      
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
      
      console.log(`[REQ-${requestId}] Response: ${response.statusCode}`);
      this.sendResponse(res, response);
    } catch (error) {
      console.error(`[REQ-${requestId}] Request handling error:`, error);
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

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = ProxyServer;