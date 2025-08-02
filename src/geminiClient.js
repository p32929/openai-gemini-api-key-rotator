const https = require('https');
const { URL } = require('url');

class GeminiClient {
  constructor(keyRotator, baseUrl = 'https://generativelanguage.googleapis.com') {
    this.keyRotator = keyRotator;
    this.baseUrl = baseUrl;
  }

  async makeRequest(method, path, body, headers = {}) {
    // Create a new request context for this specific request
    const requestContext = this.keyRotator.createRequestContext();
    let lastError = null;
    let lastResponse = null;
    
    // Try each available key for this request
    let apiKey;
    while ((apiKey = requestContext.getNextKey()) !== null) {
      const maskedKey = this.maskApiKey(apiKey);
      
      console.log(`[GEMINI::${maskedKey}] Attempting ${method} ${path}`);
      
      try {
        const response = await this.sendRequest(method, path, body, headers, apiKey);
        
        if (response.statusCode === 429) {
          console.log(`[GEMINI::${maskedKey}] Rate limited (429) - trying next key`);
          requestContext.markKeyAsRateLimited(apiKey);
          lastResponse = response; // Keep the 429 response in case all keys fail
          continue;
        }
        
        console.log(`[GEMINI::${maskedKey}] Success (${response.statusCode})`);
        return response;
      } catch (error) {
        console.log(`[GEMINI::${maskedKey}] Request failed: ${error.message}`);
        lastError = error;
        // For non-429 errors, we still try the next key
        continue;
      }
    }
    
    // All keys have been tried for this request
    const stats = requestContext.getStats();
    console.log(`[GEMINI] All ${stats.totalKeys} keys tried for this request. ${stats.rateLimitedKeys} were rate limited.`);
    
    // If all tried keys were rate limited, return 429
    if (requestContext.allTriedKeysRateLimited()) {
      console.log('[GEMINI] All keys rate limited for this request - returning 429');
      return lastResponse || {
        statusCode: 429,
        headers: { 'content-type': 'application/json' },
        data: JSON.stringify({
          error: {
            code: 429,
            message: 'All API keys have been rate limited for this request',
            status: 'RESOURCE_EXHAUSTED'
          }
        })
      };
    }
    
    // If we had other types of errors, throw the last one
    if (lastError) {
      throw lastError;
    }
    
    // Fallback error
    throw new Error('All API keys exhausted without clear error');
  }

  sendRequest(method, path, body, headers, apiKey) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      url.searchParams.append('key', apiKey);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (body && method !== 'GET') {
        const bodyData = typeof body === 'string' ? body : JSON.stringify(body);
        options.headers['Content-Length'] = Buffer.byteLength(bodyData);
      }

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });

      req.on('error', (error) => {
        const maskedKey = this.maskApiKey(apiKey);
        console.log(`[GEMINI::${maskedKey}] HTTP request error: ${error.message}`);
        reject(error);
      });

      if (body && method !== 'GET') {
        const bodyData = typeof body === 'string' ? body : JSON.stringify(body);
        req.write(bodyData);
      }

      req.end();
    });
  }

  maskApiKey(key) {
    if (!key || key.length < 8) return '***';
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  }
}

module.exports = GeminiClient;