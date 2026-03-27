export const claimTypes = [
  {
    id: 'water',
    label: 'Water Damage',
    keywords: [
      'water', 'leak', 'pipe', 'plumbing', 'flood', 'sewage',
      'overflow', 'toilet', 'dishwasher', 'washing machine', 'supply line',
      'water heater', 'burst', 'moisture', 'wet', 'damp', 'drainage',
    ],
    depthModule: 'waterDepth',
  },
  {
    id: 'storm',
    label: 'Storm Damage',
    keywords: [
      'hail', 'wind', 'storm', 'tornado', 'hurricane',
      'straight line', 'wind damage', 'roof damage', 'missing shingles',
      'blown off', 'tree', 'branch', 'lightning', 'thunderstorm',
    ],
    depthModule: 'stormDepth',
  },
  {
    id: 'fire',
    label: 'Fire Damage',
    keywords: [
      'fire', 'smoke', 'char', 'burn', 'soot', 'flame',
      'scorched', 'ash', 'ember', 'arson', 'electrical fire',
    ],
    depthModule: 'fireDepth',
  },
  {
    id: 'mold',
    label: 'Mold Damage',
    keywords: [
      'mold', 'mould', 'fungal', 'microbial', 'mildew',
      'spore', 'growth', 'black mold',
    ],
    depthModule: 'moldDepth',
  },
  {
    id: 'general',
    label: 'General',
    keywords: [],
    depthModule: 'generalDepth',
  },
];

export const claimTypeMap = claimTypes.reduce((map, ct) => {
  map[ct.id] = ct;
  return map;
}, {});
