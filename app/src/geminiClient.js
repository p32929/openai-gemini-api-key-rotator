const https = require('https');
const { URL } = require('url');

class GeminiClient {
  constructor(keyRotator, baseUrl = 'https://generativelanguage.googleapis.com') {
    this.keyRotator = keyRotator;
    this.baseUrl = baseUrl;
  }

  async makeRequest(method, path, body, headers = {}, customStatusCodes = null) {
    // Check if an API key was provided in headers
    const providedApiKey = headers['x-goog-api-key'];

    // If an API key was provided, use it directly without rotation
    if (providedApiKey) {
      const maskedKey = this.maskApiKey(providedApiKey);
      console.log(`[GEMINI::${maskedKey}] Using provided API key`);

      // Remove the x-goog-api-key from headers since we'll handle it
      const cleanHeaders = { ...headers };
      delete cleanHeaders['x-goog-api-key'];

      try {
        const response = await this.sendRequest(method, path, body, cleanHeaders, providedApiKey, true);
        console.log(`[GEMINI::${maskedKey}] Response (${response.statusCode})`);
        return response;
      } catch (error) {
        console.log(`[GEMINI::${maskedKey}] Request failed: ${error.message}`);
        throw error;
      }
    }

    // No API key provided, use rotation system
    // Create a new request context for this specific request
    const requestContext = this.keyRotator.createRequestContext();
    let lastError = null;
    let lastResponse = null;

    // Determine which status codes should trigger rotation
    // Default is just 429, but can be overridden
    const rotationStatusCodes = customStatusCodes || new Set([429]);

    // Try each available key for this request
    let apiKey;
    while ((apiKey = requestContext.getNextKey()) !== null) {
      const maskedKey = this.maskApiKey(apiKey);

      console.log(`[GEMINI::${maskedKey}] Attempting ${method} ${path}`);

      try {
        const response = await this.sendRequest(method, path, body, headers, apiKey, false);

        // Check if this status code should trigger rotation
        if (rotationStatusCodes.has(response.statusCode)) {
          console.log(`[GEMINI::${maskedKey}] Status ${response.statusCode} triggers rotation - trying next key`);
          requestContext.markKeyAsRateLimited(apiKey);
          lastResponse = response; // Keep the response in case all keys fail
          continue;
        }

        console.log(`[GEMINI::${maskedKey}] Success (${response.statusCode})`);
        return response;
      } catch (error) {
        console.log(`[GEMINI::${maskedKey}] Request failed: ${error.message}`);
        lastError = error;
        // For network errors, we still try the next key
        continue;
      }
    }
    
    // All keys have been tried for this request
    const stats = requestContext.getStats();
    console.log(`[GEMINI] All ${stats.totalKeys} keys tried for this request. ${stats.rateLimitedKeys} were rate limited.`);
    
    // Update the KeyRotator with the last failed key from this request
    const lastFailedKey = requestContext.getLastFailedKey();
    this.keyRotator.updateLastFailedKey(lastFailedKey);
    
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

  sendRequest(method, path, body, headers, apiKey, useHeader = false) {
    return new Promise((resolve, reject) => {
      // Construct full URL with smart version handling
      let fullUrl;
      if (!path || path === '/') {
        fullUrl = this.baseUrl;
      } else if (path.startsWith('/')) {
        // Handle version replacement if needed
        let effectiveBaseUrl = this.baseUrl;

        // Extract version from path (anything that looks like /vXXX/)
        const pathVersionMatch = path.match(/^\/v[^\/]+\//);
        // Extract version from base URL (anything that ends with /vXXX)
        const baseVersionMatch = this.baseUrl.match(/\/v[^\/]+$/);

        if (pathVersionMatch && baseVersionMatch) {
          const pathVersion = pathVersionMatch[0].slice(0, -1); // Remove trailing /
          const baseVersion = baseVersionMatch[0];

          // If versions are different, replace base URL version with path version
          if (pathVersion !== baseVersion) {
            effectiveBaseUrl = this.baseUrl.replace(baseVersion, pathVersion);
            // Remove the version from path since it's now in the base URL
            path = path.substring(pathVersion.length);
          }
        }

        fullUrl = effectiveBaseUrl.endsWith('/') ? effectiveBaseUrl + path.substring(1) : effectiveBaseUrl + path;
      } else {
        fullUrl = this.baseUrl.endsWith('/') ? this.baseUrl + path : this.baseUrl + '/' + path;
      }

      const url = new URL(fullUrl);

      // Set up headers
      const finalHeaders = {
        'Content-Type': 'application/json',
        ...headers
      };

      // Add API key either as header or URL parameter
      if (useHeader) {
        // Use x-goog-api-key header (official Gemini way)
        finalHeaders['x-goog-api-key'] = apiKey;
      } else {
        // Use URL parameter for backward compatibility
        url.searchParams.append('key', apiKey);
      }

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: finalHeaders
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