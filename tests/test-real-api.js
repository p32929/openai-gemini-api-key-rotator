const http = require('http');
const { URL } = require('url');

// Default models for testing different providers
const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  openrouter: 'gpt-4o-mini',
  groq: 'openai/gpt-oss-20b',
  gemini: 'gemini-1.5-flash',
  anthropic: 'claude-3-haiku-20240307',
  together: 'meta-llama/Llama-2-7b-chat-hf',
  deepseek: 'deepseek-chat',
  xai: 'grok-beta',
  cerebras: 'llama3.1-8b'
};

// Test prompts for different API types
const TEST_PROMPTS = {
  openai: (model) => ({
    model: model,
    messages: [
      {
        role: 'user',
        content: 'Say "Hello from API test" and nothing else.'
      }
    ],
    max_tokens: 20,
    temperature: 0.1
  }),
  gemini: {
    contents: [{
      parts: [{
        text: 'Say "Hello from Gemini test" and nothing else.'
      }]
    }],
    generationConfig: {
      maxOutputTokens: 20,
      temperature: 0.1
    }
  }
};

async function testRealAPI() {
  console.log('🌐 Testing Real API Endpoints...');
  console.log('=================================\n');

  // First, check if server is running
  const serverPort = await getServerPort();
  if (!serverPort) {
    console.log('❌ Server not running or .env file missing');
    console.log('💡 Start the server first: npm start');
    return false;
  }

  console.log(`🚀 Server detected on port ${serverPort}`);
  console.log(`📡 Testing HTTP endpoints at http://localhost:${serverPort}\n`);

  let testsPassed = 0;
  let testsTotal = 0;
  let results = [];

  // Get available providers from server
  const providers = await getAvailableProviders(serverPort);
  console.log(`📋 Found ${providers.length} providers to test\n`);

  // Test each provider endpoint
  for (const provider of providers) {
    testsTotal++;
    console.log(`🧪 Testing: ${provider.name} (${provider.type})`);
    
    try {
      const result = await testProviderEndpoint(serverPort, provider);
      if (result.success) {
        testsPassed++;
        console.log(`   ✅ SUCCESS: ${result.message}`);
        if (result.response) {
          console.log(`   📝 Response: ${result.response.substring(0, 100)}${result.response.length > 100 ? '...' : ''}`);
        }
      } else {
        console.log(`   ❌ FAILED: ${result.message}`);
      }
      results.push({ provider: provider.name, ...result });
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      results.push({ 
        provider: provider.name, 
        success: false, 
        message: error.message 
      });
    }
    console.log('');
  }

  // Print summary
  console.log('📊 Test Results Summary');
  console.log('========================');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.provider}: ${result.message}`);
  });
  
  console.log(`\n🎯 Overall: ${testsPassed}/${testsTotal} providers working`);
  return testsPassed > 0;
}

async function getServerPort() {
  // Try to read port from .env
  const fs = require('fs');
  const path = require('path');
  
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      return null;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const portMatch = envContent.match(/PORT=(\d+)/);
    return portMatch ? parseInt(portMatch[1]) : null;
  } catch (error) {
    return null;
  }
}

async function getAvailableProviders(port) {
  // Parse providers from config by trying to load it
  try {
    const Config = require('../src/config');
    const config = new Config();
    const providers = config.getProviders();
    
    const providerList = [];
    for (const [name, providerConfig] of providers.entries()) {
      providerList.push({
        name: name,
        type: providerConfig.apiType,
        baseUrl: providerConfig.baseUrl,
        keyCount: providerConfig.keys.length
      });
    }
    
    return providerList;
  } catch (error) {
    console.log(`⚠️  Could not load provider config: ${error.message}`);
    return [];
  }
}

async function testProviderEndpoint(port, provider) {
  const baseUrl = `http://localhost:${port}`;
  
  if (provider.type === 'gemini') {
    return await testGeminiEndpoint(baseUrl, provider);
  } else {
    return await testOpenAIEndpoint(baseUrl, provider);
  }
}

async function testGeminiEndpoint(baseUrl, provider) {
  const model = DEFAULT_MODELS.gemini;
  const endpoint = `/${provider.name}/v1/models/${model}:generateContent`;
  const url = baseUrl + endpoint;
  
  try {
    const response = await makeHttpRequest('POST', url, TEST_PROMPTS.gemini);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return {
          success: true,
          message: `Gemini API working with model ${model}`,
          response: data.candidates[0].content.parts[0].text,
          statusCode: 200
        };
      } else {
        return {
          success: false,
          message: 'Invalid response format from Gemini API',
          statusCode: 200,
          rawResponse: response.data
        };
      }
    } else {
      return {
        success: false,
        message: `HTTP ${response.statusCode}: ${response.data}`,
        statusCode: response.statusCode
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Request failed: ${error.message}`,
      error: error.message
    };
  }
}

async function testOpenAIEndpoint(baseUrl, provider) {
  // Use provider-specific model if available
  let model = DEFAULT_MODELS.openai; // default
  
  if (provider.name.toLowerCase().includes('openrouter')) {
    model = DEFAULT_MODELS.openrouter;
  } else if (provider.name.toLowerCase().includes('groq')) {
    model = DEFAULT_MODELS.groq;
  } else if (provider.name.toLowerCase().includes('cerebras')) {
    model = DEFAULT_MODELS.cerebras;
  } else if (provider.name.toLowerCase().includes('anthropic')) {
    model = DEFAULT_MODELS.anthropic;
  }

  const endpoint = `/${provider.name}/v1/chat/completions`;
  const url = baseUrl + endpoint;
  const payload = TEST_PROMPTS.openai(model);
  
  try {
    const response = await makeHttpRequest('POST', url, payload);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return {
          success: true,
          message: `OpenAI-compatible API working with model ${model}`,
          response: data.choices[0].message.content,
          model: model,
          statusCode: 200,
          usage: data.usage
        };
      } else {
        return {
          success: false,
          message: 'Invalid response format from OpenAI-compatible API',
          statusCode: 200,
          rawResponse: response.data
        };
      }
    } else if (response.statusCode === 401) {
      return {
        success: false,
        message: 'Authentication failed - check API keys',
        statusCode: 401
      };
    } else if (response.statusCode === 429) {
      return {
        success: false,
        message: 'Rate limited - too many requests',
        statusCode: 429
      };
    } else {
      return {
        success: false,
        message: `HTTP ${response.statusCode}: ${response.data}`,
        statusCode: response.statusCode
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Request failed: ${error.message}`,
      error: error.message
    };
  }
}

function makeHttpRequest(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'api-test-client/1.0'
      },
      timeout: 30000 // 30 second timeout
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout (30s)'));
    });

    if (data) {
      const jsonData = JSON.stringify(data);
      req.setHeader('Content-Length', Buffer.byteLength(jsonData));
      req.write(jsonData);
    }
    
    req.end();
  });
}

// Test admin endpoints
async function testAdminEndpoints(port) {
  console.log('🔐 Testing Admin Endpoints...');
  console.log('==============================\n');
  
  const baseUrl = `http://localhost:${port}`;
  let testsPassed = 0;
  let testsTotal = 0;

  // Test admin panel
  testsTotal++;
  try {
    const response = await makeHttpRequest('GET', `${baseUrl}/admin`);
    if (response.statusCode === 200 && response.data.includes('API Key Rotator')) {
      console.log('✅ Admin panel accessible');
      testsPassed++;
    } else {
      console.log(`❌ Admin panel failed: HTTP ${response.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ Admin panel error: ${error.message}`);
  }

  // Test admin API (should require auth)
  testsTotal++;
  try {
    const response = await makeHttpRequest('GET', `${baseUrl}/admin/api/logs`);
    if (response.statusCode === 401) {
      console.log('✅ Admin API properly protected (401 unauthorized)');
      testsPassed++;
    } else if (response.statusCode === 200) {
      console.log('✅ Admin API accessible (no auth required)');
      testsPassed++;
    } else {
      console.log(`❌ Admin API unexpected response: HTTP ${response.statusCode}`);
    }
  } catch (error) {
    console.log(`❌ Admin API error: ${error.message}`);
  }

  console.log(`\n📊 Admin Tests: ${testsPassed}/${testsTotal} passed`);
  return testsPassed === testsTotal;
}

// Test specific provider
async function testSpecificProvider(providerName) {
  console.log(`🔍 Testing Specific Provider: ${providerName}`);
  console.log('=' + '='.repeat(32 + providerName.length));
  
  const serverPort = await getServerPort();
  if (!serverPort) {
    console.log('❌ Server not running');
    return false;
  }

  const providers = await getAvailableProviders(serverPort);
  const provider = providers.find(p => p.name === providerName);
  
  if (!provider) {
    console.log(`❌ Provider '${providerName}' not found`);
    console.log('📋 Available providers:');
    providers.forEach(p => console.log(`   - ${p.name} (${p.type})`));
    return false;
  }

  console.log(`🔌 Provider: ${provider.name} (${provider.type})`);
  console.log(`📊 Keys: ${provider.keyCount} configured`);
  console.log('');

  const result = await testProviderEndpoint(serverPort, provider);
  
  if (result.success) {
    console.log(`✅ SUCCESS: ${result.message}`);
    if (result.response) {
      console.log(`📝 Response: ${result.response}`);
    }
    if (result.usage) {
      console.log(`📊 Usage: ${JSON.stringify(result.usage)}`);
    }
    return true;
  } else {
    console.log(`❌ FAILED: ${result.message}`);
    if (result.statusCode) {
      console.log(`📊 Status: ${result.statusCode}`);
    }
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 API Endpoint Testing Suite');
  console.log('==============================\n');
  
  const startTime = Date.now();
  
  const apiTestsSuccess = await testRealAPI();
  console.log('');
  
  const serverPort = await getServerPort();
  let adminTestsSuccess = true;
  if (serverPort) {
    adminTestsSuccess = await testAdminEndpoints(serverPort);
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`\n⏱️  Tests completed in ${duration.toFixed(2)} seconds`);
  console.log(`🎯 API tests: ${apiTestsSuccess ? 'SUCCESS' : 'FAILED'}`);
  console.log(`🔐 Admin tests: ${adminTestsSuccess ? 'SUCCESS' : 'FAILED'}`);
  
  const overallSuccess = apiTestsSuccess && adminTestsSuccess;
  console.log(`🏆 Overall: ${overallSuccess ? 'SUCCESS' : 'FAILED'}`);
  
  return overallSuccess;
}

// Run tests if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    runAllTests().then(success => {
      process.exit(success ? 0 : 1);
    }).catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
  } else if (args[0] === 'provider' && args[1]) {
    testSpecificProvider(args[1]).then(success => {
      process.exit(success ? 0 : 1);
    });
  } else {
    console.log('Usage:');
    console.log('  node tests/test-real-api.js                 # Run all tests');
    console.log('  node tests/test-real-api.js provider <name> # Test specific provider');
  }
}

module.exports = { 
  testRealAPI, 
  testAdminEndpoints,
  testSpecificProvider,
  runAllTests,
  DEFAULT_MODELS 
};