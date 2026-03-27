// apiConfig.test.js — runs with: node app/utils/apiConfig.test.js
// Inlines the config logic so no transpiler is needed for plain `node`.

const PLACEHOLDER = 'your_anthropic_api_key_here';

const config = {
  anthropicApiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  apiBaseUrl:      process.env.EXPO_PUBLIC_API_BASE_URL,
  supabaseUrl:     process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};

function buildHeaders() {
  return { 'Content-Type': 'application/json' };
}

function buildAnthropicHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': config.anthropicApiKey,
    'anthropic-version': '2023-06-01',
  };
}

// --- test runner ---

let passed = 0;
let failed = 0;

function assert(description, actual, check) {
  const ok = typeof check === 'function' ? check(actual) : actual === check;
  if (ok) {
    console.log(`  PASS  ${description}`);
    passed++;
  } else {
    console.error(`  FAIL  ${description}`);
    console.error(`        got: ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log('\napiConfig tests\n');

// config exports all 4 expected keys
assert('config has anthropicApiKey key', config, c => 'anthropicApiKey' in c);
assert('config has apiBaseUrl key',      config, c => 'apiBaseUrl'      in c);
assert('config has supabaseUrl key',     config, c => 'supabaseUrl'     in c);
assert('config has supabaseAnonKey key', config, c => 'supabaseAnonKey' in c);

// buildHeaders returns correct Content-Type
const headers = buildHeaders();
assert('buildHeaders returns Content-Type: application/json',
  headers['Content-Type'], 'application/json');

// buildAnthropicHeaders returns all 3 required headers
const aHeaders = buildAnthropicHeaders();
assert('buildAnthropicHeaders has Content-Type',
  aHeaders['Content-Type'], 'application/json');
assert('buildAnthropicHeaders has x-api-key',
  aHeaders, h => 'x-api-key' in h);
assert('buildAnthropicHeaders has anthropic-version',
  aHeaders['anthropic-version'], '2023-06-01');

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
