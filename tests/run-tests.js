const { testGeminiDirect } = require('./test-gemini');
const { testOpenAIDirect } = require('./test-openai');

async function runTests() {
  console.log('🚀 Running Unit Tests');
  console.log('====================\n');
  
  // Run Gemini tests
  await testGeminiDirect();
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Run OpenAI tests
  await testOpenAIDirect();
  
  console.log('\n🎉 All unit tests completed!');
  console.log('📊 Direct function calls - no server required');
}

// Run all tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };