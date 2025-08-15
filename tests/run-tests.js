const { testRealAPI, testAdminEndpoints, testSpecificProvider, DEFAULT_MODELS } = require('./test-real-api');

async function runAllTests() {
  console.log('🚀 OpenAI-Gemini API Key Rotator - Test Suite');
  console.log('==============================================');
  console.log('Testing real HTTP API endpoints\n');
  
  const startTime = Date.now();
  let overallSuccess = true;

  // Display current default models
  console.log('🎯 Default Models Configuration:');
  Object.entries(DEFAULT_MODELS).forEach(([provider, model]) => {
    console.log(`   ${provider}: ${model}`);
  });
  console.log('');

  // Check environment
  const fs = require('fs');
  if (!fs.existsSync('.env')) {
    console.log('❌ .env file not found!');
    console.log('📝 Please create .env file with your API configurations.');
    console.log('   Example format:');
    console.log('   PORT=3000');
    console.log('   ADMIN_PASSWORD=your-admin-password');
    console.log('   PROVIDER_openai_main_API_TYPE=openai');
    console.log('   PROVIDER_openai_main_BASE_URL=https://api.openai.com/v1');
    console.log('   PROVIDER_openai_main_API_KEYS=sk-your-key-here');
    console.log('');
    console.log('💡 Start your server first: npm start');
    return false;
  }

  try {
    // Test 1: Real API HTTP Endpoint Testing
    console.log('🌐 Phase 1: HTTP API Endpoint Testing');
    console.log('======================================');
    const apiSuccess = await testRealAPI();
    if (!apiSuccess) {
      console.log('⚠️  API endpoint tests failed - check server and configuration');
      overallSuccess = false;
    }

    // Test 2: Admin Endpoints
    console.log('\n🔐 Phase 2: Admin Panel Testing');
    console.log('================================');
    const adminSuccess = await testAdminEndpoints(await getServerPort());
    if (!adminSuccess) {
      console.log('⚠️  Admin endpoint tests failed');
      overallSuccess = false;
    }

  } catch (error) {
    console.error('💥 Test suite crashed:', error.message);
    console.error(error.stack);
    overallSuccess = false;
  }

  // Results summary
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\n📊 Test Suite Summary');
  console.log('=====================');
  console.log(`⏱️  Total time: ${duration.toFixed(2)} seconds`);
  console.log(`🎯 Overall result: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (overallSuccess) {
    console.log('🎉 All HTTP endpoint tests passed! Your API rotator is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
    console.log('💡 Common issues:');
    console.log('   - Server not running (run: npm start)');
    console.log('   - Invalid API keys in .env file');
    console.log('   - Wrong API models or endpoints');
    console.log('   - Network connectivity issues');
    console.log('   - Rate limiting from API providers');
  }
  
  return overallSuccess;
}

async function getServerPort() {
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


// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run all tests
    runAllTests().then(success => {
      process.exit(success ? 0 : 1);
    }).catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
  } else if (args[0] === 'provider' && args[1]) {
    // Test specific provider
    testSpecificProvider(args[1]).then(success => {
      process.exit(success ? 0 : 1);
    });
  } else {
    console.log('Usage:');
    console.log('  node tests/run-tests.js                    # Run all tests');
    console.log('  node tests/run-tests.js provider <name>    # Test specific provider');
  }
}

module.exports = { 
  runAllTests, 
  testSpecificProvider 
};