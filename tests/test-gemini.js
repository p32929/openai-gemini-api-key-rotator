const Config = require('../src/config');
const KeyRotator = require('../src/keyRotator');
const GeminiClient = require('../src/geminiClient');

async function testGeminiDirect() {
  console.log('🧪 Testing Gemini API (Direct Function Calls)...');
  console.log('================================================\n');

  try {
    // Initialize components
    const config = new Config();
    
    if (!config.hasGeminiKeys()) {
      console.log('❌ No Gemini API keys found in .env file');
      return;
    }

    const geminiKeyRotator = new KeyRotator(config.getGeminiApiKeys(), 'gemini');
    const geminiClient = new GeminiClient(geminiKeyRotator, config.getGeminiBaseUrl());

    // Test 1: Generate Content
    console.log('📝 Test 1: Gemini generateContent');
    try {
      const response = await geminiClient.makeRequest('POST', '/v1/models/gemini-2.5-pro:generateContent', {
        contents: [{
          parts: [{
            text: 'Say hello and tell me you are working correctly'
          }]
        }]
      });
      
      console.log(`Status: ${response.statusCode}`);
      if (response.statusCode === 200) {
        console.log('✅ SUCCESS');
        const result = JSON.parse(response.data);
        if (result.candidates && result.candidates[0]) {
          console.log('Response:', result.candidates[0].content.parts[0].text.substring(0, 100) + '...');
        }
      } else {
        console.log('❌ FAILED');
        console.log('Response:', response.data);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    console.log('');

    // Test 2: List Models
    console.log('📋 Test 2: Gemini models list');
    try {
      const response = await geminiClient.makeRequest('GET', '/v1/models');
      
      console.log(`Status: ${response.statusCode}`);
      if (response.statusCode === 200) {
        console.log('✅ SUCCESS');
        const models = JSON.parse(response.data);
        if (models.models) {
          console.log(`Found ${models.models.length} models`);
        }
      } else {
        console.log('❌ FAILED');
        console.log('Response:', response.data);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    console.log('');

    // Test 3: Get Model Info
    console.log('ℹ️  Test 3: Gemini model info');
    try {
      const response = await geminiClient.makeRequest('GET', '/v1/models/gemini-2.5-pro');
      
      console.log(`Status: ${response.statusCode}`);
      if (response.statusCode === 200) {
        console.log('✅ SUCCESS');
        const modelInfo = JSON.parse(response.data);
        console.log('Model name:', modelInfo.name);
      } else {
        console.log('❌ FAILED');
        console.log('Response:', response.data);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

  } catch (error) {
    console.error('❌ Test initialization failed:', error.message);
  }

  console.log('\n🔍 All direct function tests completed');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testGeminiDirect();
}

module.exports = { testGeminiDirect };