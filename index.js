const Config = require('./src/config');
const KeyRotator = require('./src/keyRotator');
const GeminiClient = require('./src/geminiClient');
const OpenAIClient = require('./src/openaiClient');
const ProxyServer = require('./src/server');

function main() {
  try {
    const config = new Config();
    
    let geminiClient = null;
    let openaiClient = null;
    
    // Initialize Gemini client if keys are available
    if (config.hasGeminiKeys()) {
      const geminiKeyRotator = new KeyRotator(config.getGeminiApiKeys(), 'gemini');
      geminiClient = new GeminiClient(geminiKeyRotator, config.getGeminiBaseUrl());
      console.log('[INIT] Gemini client initialized');
    } else if (config.hasAdminPassword()) {
      console.log('[INIT] No Gemini keys found - can be configured via admin panel');
    }
    
    // Initialize OpenAI client if keys are available
    if (config.hasOpenaiKeys()) {
      const openaiKeyRotator = new KeyRotator(config.getOpenaiApiKeys(), 'openai');
      openaiClient = new OpenAIClient(openaiKeyRotator, config.getOpenaiBaseUrl());
      console.log('[INIT] OpenAI client initialized');
    } else if (config.hasAdminPassword()) {
      console.log('[INIT] No OpenAI keys found - can be configured via admin panel');
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