const fs = require('fs');
const path = require('path');

class Config {
  constructor() {
    this.port = null;
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
    this.geminiApiKeys = this.parseApiKeys(envVars.GEMINI_API_KEYS);
    this.openaiApiKeys = this.parseApiKeys(envVars.OPENAI_API_KEYS);
    this.baseUrl = envVars.BASE_URL || null;
    this.openaiBaseUrl = envVars.OPENAI_BASE_URL || null;

    console.log(`[CONFIG] Port: ${this.port}`);
    if (this.baseUrl) {
      console.log(`[CONFIG] Custom Base URL: ${this.baseUrl}`);
    } else if (this.openaiBaseUrl) {
      console.log(`[CONFIG] Custom OpenAI Base URL: ${this.openaiBaseUrl}`);
    } else {
      console.log(`[CONFIG] Using default API endpoints`);
    }
    console.log(`[CONFIG] Found ${this.geminiApiKeys.length} Gemini API keys`);
    console.log(`[CONFIG] Found ${this.openaiApiKeys.length} OpenAI API keys`);

    if (this.geminiApiKeys.length === 0 && this.openaiApiKeys.length === 0) {
      throw new Error('At least one API key (GEMINI_API_KEYS or OPENAI_API_KEYS) must be provided in .env file');
    }
    
    this.geminiApiKeys.forEach((key, index) => {
      const maskedKey = this.maskApiKey(key);
      console.log(`[CONFIG] Gemini Key ${index + 1}: [${maskedKey}]`);
    });
    
    this.openaiApiKeys.forEach((key, index) => {
      const maskedKey = this.maskApiKey(key);
      console.log(`[CONFIG] OpenAI Key ${index + 1}: [${maskedKey}]`);
    });
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
    return this.baseUrl || this.openaiBaseUrl || 'https://api.openai.com';
  }

  hasGeminiKeys() {
    return this.geminiApiKeys.length > 0;
  }

  hasOpenaiKeys() {
    return this.openaiApiKeys.length > 0;
  }

  maskApiKey(key) {
    if (!key || key.length < 8) return '***';
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  }
}

module.exports = Config;