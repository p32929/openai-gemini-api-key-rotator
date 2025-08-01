const https = require('https');
const { URL } = require('url');

class GeminiClient {
  constructor(keyRotator, baseUrl = 'https://generativelanguage.googleapis.com') {
    this.keyRotator = keyRotator;
    this.baseUrl = baseUrl;
  }

  async makeRequest(method, path, body, headers = {}) {
    let lastError = null;
    let attemptCount = 0;
    
    while (this.keyRotator.getCurrentKey()) {
      const apiKey = this.keyRotator.getCurrentKey();
      const maskedKey = this.maskApiKey(apiKey);
      attemptCount++;
      
      console.log(`[GEMINI::${maskedKey}] Attempting ${method} ${path} (attempt ${attemptCount})`);
      
      try {
        const response = await this.sendRequest(method, path, body, headers, apiKey);
        
        if (response.statusCode === 429) {
          console.log(`[GEMINI::${maskedKey}] Rate limited (429) - rotating to next key`);
          this.keyRotator.markCurrentKeyAsFailed();
          continue;
        }
        
        console.log(`[GEMINI::${maskedKey}] Success (${response.statusCode})`);
        return response;
      } catch (error) {
        console.log(`[GEMINI::${maskedKey}] Request failed: ${error.message}`);
        lastError = error;
        this.keyRotator.markCurrentKeyAsFailed();
      }
    }
    
    if (this.keyRotator.allKeysFailed()) {
      console.log('[CLIENT] All API keys exhausted - returning 429');
      return {
        statusCode: 429,
        headers: { 'content-type': 'application/json' },
        data: JSON.stringify({
          error: {
            code: 429,
            message: 'All API keys have been rate limited',
            status: 'RESOURCE_EXHAUSTED'
          }
        })
      };
    }
    
    throw lastError;
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