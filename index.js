const Config = require('./src/config');
const KeyRotator = require('./src/keyRotator');
const GeminiClient = require('./src/geminiClient');
const OpenAIClient = require('./src/openaiClient');
const ProxyServer = require('./src/server');

function main() {
  try {
    const config = new Config();
    
    // Initialize legacy clients for backward compatibility
    let geminiClient = null;
    let openaiClient = null;
    
    if (config.hasGeminiKeys()) {
      const geminiKeyRotator = new KeyRotator(config.getGeminiApiKeys(), 'gemini');
      geminiClient = new GeminiClient(geminiKeyRotator, config.getGeminiBaseUrl());
      console.log('[INIT] Legacy Gemini client initialized');
    } else if (config.hasAdminPassword()) {
      console.log('[INIT] No legacy Gemini keys found - can be configured via admin panel');
    }
    
    if (config.hasOpenaiKeys()) {
      const openaiKeyRotator = new KeyRotator(config.getOpenaiApiKeys(), 'openai');
      openaiClient = new OpenAIClient(openaiKeyRotator, config.getOpenaiBaseUrl());
      console.log('[INIT] Legacy OpenAI client initialized');
    } else if (config.hasAdminPassword()) {
      console.log('[INIT] No legacy OpenAI keys found - can be configured via admin panel');
    }
    
    // Check if we have at least one provider configured or admin panel enabled
    if (config.getProviders().size === 0 && !config.hasAdminPassword()) {
      throw new Error('No providers configured and no admin password set. Please configure at least one provider or set ADMIN_PASSWORD.');
    }
    
    const server = new ProxyServer(config, geminiClient, openaiClient);
    server.start();
    
    process.on('SIGINT', () => {
      console.log('\nShutting down server...');
      server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { Config, KeyRotator, GeminiClient, OpenAIClient, ProxyServer };