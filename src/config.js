const fs = require('fs');
const path = require('path');

class Config {
  constructor() {
    this.port = null;
    this.providers = new Map(); // Map of provider_name -> { apiType, keys, baseUrl }
    this.geminiApiKeys = [];
    this.openaiApiKeys = [];
    this.baseUrl = null;
    this.loadConfig();
  }

  loadConfig() {
    const envPath = path.join(process.cwd(), '.env');
    
    console.log(`[CONFIG] Loading configuration from ${envPath}`);
    
    if (!fs.existsSync(envPath)) {
      throw new Error('.env file not found');
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = this.parseEnvFile(envContent);

    if (!envVars.PORT) {
      throw new Error('PORT is required in .env file');
    }
    
    this.port = parseInt(envVars.PORT);
    this.adminPassword = envVars.ADMIN_PASSWORD || null;
    
    // Clear existing providers
    this.providers.clear();
    
    // Parse new provider format and maintain backward compatibility
    this.parseProviders(envVars);
    this.parseBackwardCompatibility(envVars);

    console.log(`[CONFIG] Port: ${this.port}`);
    console.log(`[CONFIG] Found ${this.providers.size} providers configured`);
    
    // Log each provider
    for (const [providerName, config] of this.providers.entries()) {
      const maskedKeys = config.keys.map(key => this.maskApiKey(key));
      console.log(`[CONFIG] Provider '${providerName}' (${config.apiType}): ${config.keys.length} keys [${maskedKeys.join(', ')}] → ${config.baseUrl}`);
    }
    
    // Check if admin panel is configured
    if (this.adminPassword) {
      console.log(`[CONFIG] Admin panel enabled - providers can be managed via admin interface`);
    } else {
      console.log(`[CONFIG] No admin password set - at least one provider must be configured in .env`);
      if (this.providers.size === 0) {
        throw new Error('Either ADMIN_PASSWORD must be set (to enable admin panel) or at least one provider must be configured in .env file');
      }
    }
  }

  parseEnvFile(content) {
    const envVars = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        continue;
      }

      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        continue;
      }

      const key = trimmedLine.substring(0, equalIndex).trim();
      const value = trimmedLine.substring(equalIndex + 1).trim();
      
      envVars[key] = value;
    }

    return envVars;
  }

  parseApiKeys(keysString) {
    if (!keysString) {
      return [];
    }

    return keysString
      .split(',')
      .map(key => key.trim())
      .filter(key => key.length > 0);
  }

  parseProviders(envVars) {
    // Parse {API_TYPE}_{PROVIDER}_API_KEYS and {API_TYPE}_{PROVIDER}_BASE_URL format
    const providerConfigs = new Map();

    for (const [key, value] of Object.entries(envVars)) {
      if (key.endsWith('_API_KEYS') && value) {
        // Extract API_TYPE and PROVIDER from key
        const parts = key.replace('_API_KEYS', '').split('_');
        if (parts.length >= 1) {
          const apiType = parts[0].toLowerCase();
          // If no provider name specified, use the API type as provider name (default)
          const provider = parts.length === 1 ? apiType : parts.slice(1).join('_').toLowerCase();
          
          if (!providerConfigs.has(provider)) {
            providerConfigs.set(provider, { apiType, keys: [], baseUrl: null });
          }
          
          providerConfigs.get(provider).keys = this.parseApiKeys(value);
          providerConfigs.get(provider).apiType = apiType;
        }
      } else if (key.endsWith('_BASE_URL') && value) {
        // Extract API_TYPE and PROVIDER from key
        const parts = key.replace('_BASE_URL', '').split('_');
        if (parts.length >= 1) {
          const apiType = parts[0].toLowerCase();
          // If no provider name specified, use the API type as provider name (default)
          const provider = parts.length === 1 ? apiType : parts.slice(1).join('_').toLowerCase();
          
          if (!providerConfigs.has(provider)) {
            providerConfigs.set(provider, { apiType, keys: [], baseUrl: null });
          }
          
          providerConfigs.get(provider).baseUrl = value.trim();
        }
      }
    }

    // Add valid providers to the main providers map
    for (const [provider, config] of providerConfigs.entries()) {
      if (config.keys.length > 0) {
        // Set default base URLs if not specified
        if (!config.baseUrl) {
          if (config.apiType === 'openai') {
            config.baseUrl = 'https://api.openai.com/v1';
          } else if (config.apiType === 'gemini') {
            config.baseUrl = 'https://generativelanguage.googleapis.com/v1';
          }
        }
        
        this.providers.set(provider, config);
      }
    }
  }

  parseBackwardCompatibility(envVars) {
    // Maintain backward compatibility with old format
    this.geminiApiKeys = this.parseApiKeys(envVars.GEMINI_API_KEYS);
    this.openaiApiKeys = this.parseApiKeys(envVars.OPENAI_API_KEYS);
    this.baseUrl = (envVars.BASE_URL && envVars.BASE_URL.trim()) ? envVars.BASE_URL.trim() : null;

    // If old format is used, create default providers
    if (this.openaiApiKeys.length > 0) {
      const baseUrl = this.baseUrl || 'https://api.openai.com/v1';
      this.providers.set('openai', {
        apiType: 'openai',
        keys: this.openaiApiKeys,
        baseUrl: baseUrl
      });
    }

    if (this.geminiApiKeys.length > 0) {
      const baseUrl = 'https://generativelanguage.googleapis.com/v1';
      this.providers.set('gemini', {
        apiType: 'gemini',
        keys: this.geminiApiKeys,
        baseUrl: baseUrl
      });
    }
  }

  getPort() {
    return this.port;
  }

  getGeminiApiKeys() {
    return [...this.geminiApiKeys];
  }

  getOpenaiApiKeys() {
    return [...this.openaiApiKeys];
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  getGeminiBaseUrl() {
    return this.baseUrl || 'https://generativelanguage.googleapis.com';
  }

  getOpenaiBaseUrl() {
    return this.baseUrl || 'https://api.openai.com';
  }

  hasGeminiKeys() {
    return this.geminiApiKeys.length > 0;
  }

  hasOpenaiKeys() {
    return this.openaiApiKeys.length > 0;
  }

  getAdminPassword() {
    return this.adminPassword;
  }

  hasAdminPassword() {
    return this.adminPassword && this.adminPassword.length > 0;
  }

  maskApiKey(key) {
    if (!key || key.length < 8) return '***';
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  }

  // New provider methods
  getProviders() {
    return this.providers;
  }

  getProvider(providerName) {
    return this.providers.get(providerName);
  }

  hasProvider(providerName) {
    return this.providers.has(providerName);
  }

  getProvidersByApiType(apiType) {
    const result = new Map();
    for (const [name, config] of this.providers.entries()) {
      if (config.apiType === apiType) {
        result.set(name, config);
      }
    }
    return result;
  }

  // Backward compatibility - these methods now aggregate across all providers
  getAllGeminiKeys() {
    const keys = [];
    for (const [, config] of this.providers.entries()) {
      if (config.apiType === 'gemini') {
        keys.push(...config.keys);
      }
    }
    return keys;
  }

  getAllOpenaiKeys() {
    const keys = [];
    for (const [, config] of this.providers.entries()) {
      if (config.apiType === 'openai') {
        keys.push(...config.keys);
      }
    }
    return keys;
  }
}

module.exports = Config;