// detectClaimType.test.js — runs with: node app/utils/detectClaimType.test.js
// Inline implementation mirrors detectClaimType.js / claimTypes.js
// (no transpiler available in plain `node` execution)

const claimTypes = [
  {
    id: 'water',
    keywords: [
      'water', 'leak', 'pipe', 'plumbing', 'flood', 'sewage',
      'overflow', 'toilet', 'dishwasher', 'washing machine', 'supply line',
      'water heater', 'burst', 'moisture', 'wet', 'damp', 'drainage',
    ],
  },
  {
    id: 'storm',
    keywords: [
      'hail', 'wind', 'storm', 'tornado', 'hurricane',
      'straight line', 'wind damage', 'roof damage', 'missing shingles',
      'blown off', 'tree', 'branch', 'lightning', 'thunderstorm',
    ],
  },
  {
    id: 'fire',
    keywords: [
      'fire', 'smoke', 'char', 'burn', 'soot', 'flame',
      'scorched', 'ash', 'ember', 'arson', 'electrical fire',
    ],
  },
  {
    id: 'mold',
    keywords: [
      'mold', 'mould', 'fungal', 'microbial', 'mildew',
      'spore', 'growth', 'black mold',
    ],
  },
];

function detectClaimType(text) {
  if (!text) return 'general';
  const lower = text.toLowerCase();
  for (const ct of claimTypes) {
    for (const keyword of ct.keywords) {
      if (lower.includes(keyword)) return ct.id;
    }
  }
  return 'general';
}

// --- test runner ---

let passed = 0;
let failed = 0;

function assert(description, input, expected) {
  const result = detectClaimType(input);
  if (result === expected) {
    console.log(`  PASS  ${description}`);
    passed++;
  } else {
    console.error(`  FAIL  ${description}`);
    console.error(`        input:    ${JSON.stringify(input)}`);
    console.error(`        expected: ${expected}`);
    console.error(`        got:      ${result}`);
    failed++;
  }
}

console.log('\ndetectClaimType tests\n');

assert('"water leak in bathroom" → water',       'water leak in bathroom',        'water');
assert('"hail damage on roof"   → storm',        'hail damage on roof',           'storm');
assert('"fire in kitchen"       → fire',          'fire in kitchen',               'fire');
assert('"mold in basement"      → mold',          'mold in basement',              'mold');
assert('"inspected the property today" → general','inspected the property today',  'general');
assert('"" (empty string)       → general',       '',                              'general');
assert('null                    → general',       null,                            'general');

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
