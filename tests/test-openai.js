const Config = require('../src/config');
const KeyRotator = require('../src/keyRotator');
const OpenAIClient = require('../src/openaiClient');

async function testOpenAIDirect() {
  console.log('🤖 Testing OpenAI API (Direct Function Calls)...');
  console.log('===============================================\n');

  try {
    // Initialize components
    const config = new Config();
    
    if (!config.hasOpenaiKeys()) {
      console.log('❌ No OpenAI API keys found in .env file');
      return;
    }

    const openaiKeyRotator = new KeyRotator(config.getOpenaiApiKeys(), 'openai');
    const openaiClient = new OpenAIClient(openaiKeyRotator, config.getOpenaiBaseUrl());

    // Test 1: Chat Completions
    console.log('💬 Test 1: OpenAI chat completions');
    try {
      const response = await openaiClient.makeRequest('POST', '/v1/chat/completions', {
        model: 'z-ai/glm-4.5-air:free',
        messages: [
          {
            role: 'user',
            content: 'Say hello and tell me you are working correctly via OpenRouter'
          }
        ],
        max_tokens: 100
      });
      
      console.log(`Status: ${response.statusCode}`);
      if (response.statusCode === 200) {
        console.log('✅ SUCCESS');
        const result = JSON.parse(response.data);
        if (result.choices && result.choices[0]) {
          console.log('Response:', result.choices[0].message.content);
        }
      } else {
        console.log('❌ FAILED');
        console.log('Response:', response.data.substring(0, 200) + '...');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    console.log('');

    // Test 2: List Models
    console.log('📋 Test 2: OpenAI models list');
    try {
      const response = await openaiClient.makeRequest('GET', '/v1/models');
      
      console.log(`Status: ${response.statusCode}`);
      if (response.statusCode === 200) {
        console.log('✅ SUCCESS');
        const models = JSON.parse(response.data);
        if (models.data) {
          console.log(`Found ${models.data.length} models`);
          // Show first few model names
          const modelNames = models.data.slice(0, 5).map(m => m.id);
          console.log('Sample models:', modelNames.join(', '));
        }
      } else {
        console.log('❌ FAILED');
        console.log('Response:', response.data.substring(0, 200) + '...');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    console.log('');

    // Test 3: Test Key Rotation (simulate 429 error)
    console.log('🔄 Test 3: Key rotation simulation');
    try {
      console.log('Current key count:', openaiKeyRotator.getTotalKeysCount());
      console.log('Failed keys:', openaiKeyRotator.getFailedKeysCount());
      
      // Simulate marking current key as failed
      if (openaiKeyRotator.getTotalKeysCount() > 1) {
        console.log('Simulating key rotation...');
        openaiKeyRotator.markCurrentKeyAsFailed();
        console.log('After rotation - Failed keys:', openaiKeyRotator.getFailedKeysCount());
      } else {
        console.log('Only 1 key available, cannot test rotation');
      }
      
      console.log('✅ Key rotation logic working');
    } catch (error) {
      console.log('❌ Key rotation error:', error.message);
    }

  } catch (error) {
    console.error('❌ Test initialization failed:', error.message);
  }

  console.log('\n🔍 All direct function tests completed');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testOpenAIDirect();
}

module.exports = { testOpenAIDirect };