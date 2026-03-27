// app/utils/tokenTracker.js
// Ticket 015 — Token Tracking Instrumentation
//
// Wraps every Anthropic API call with cost and usage visibility.
// Alpha: logs to console only.
// Beta: persists to Supabase (structure ready, call commented out).
//
// Pricing constants — update here when Anthropic changes rates.
// All prices in USD per 1M tokens.

const PRICING = {
  'claude-haiku-4-5-20251001': {
    input:  0.80,   // $0.80 per 1M input tokens
    output: 4.00,   // $4.00 per 1M output tokens
  },
  'claude-sonnet-4-6': {
    input:  3.00,
    output: 15.00,
  },
  // Add new models here as they are introduced
};

// Running session totals — reset on app restart, persisted to Supabase in beta
const sessionTotals = {
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  costUsd: 0,
};

/**
 * Calculate cost in USD for a given model and token counts.
 */
function calculateCost(model, inputTokens, outputTokens) {
  const rates = PRICING[model];
  if (!rates) {
    console.warn(`[tokenTracker] No pricing data for model: ${model}`);
    return 0;
  }
  return (inputTokens / 1_000_000) * rates.input +
         (outputTokens / 1_000_000) * rates.output;
}

/**
 * Record a completed API call.
 * Call this after every successful Anthropic response.
 *
 * @param {object} params
 * @param {string} params.route        - e.g. '/api/review'
 * @param {string} params.model        - model string used
 * @param {number} params.inputTokens  - from response.usage.input_tokens
 * @param {number} params.outputTokens - from response.usage.output_tokens
 * @param {number} params.durationMs   - wall time for the call in ms
 * @param {string} params.claimType    - claim type routed to
 * @param {string} [params.userId]     - Supabase user id if available
 */
export function recordCall({
  route,
  model,
  inputTokens,
  outputTokens,
  durationMs,
  claimType,
  userId = null,
}) {
  const costUsd = calculateCost(model, inputTokens, outputTokens);

  // Update session totals
  sessionTotals.calls += 1;
  sessionTotals.inputTokens += inputTokens;
  sessionTotals.outputTokens += outputTokens;
  sessionTotals.costUsd += costUsd;

  const entry = {
    timestamp:    new Date().toISOString(),
    route,
    model,
    inputTokens,
    outputTokens,
    costUsd:      parseFloat(costUsd.toFixed(6)),
    durationMs,
    claimType,
    userId,
    sessionTotals: { ...sessionTotals },
  };

  // Alpha: console log only
  console.log('[tokenTracker]', JSON.stringify(entry, null, 2));

  // Beta: uncomment to persist to Supabase
  // persistToSupabase(entry);

  return entry;
}

/**
 * Get current session totals.
 * Used by future UI to display running cost in dev/admin mode.
 */
export function getSessionTotals() {
  return { ...sessionTotals };
}

/**
 * Reset session totals.
 * Call on sign out or new session start.
 */
export function resetSessionTotals() {
  sessionTotals.calls = 0;
  sessionTotals.inputTokens = 0;
  sessionTotals.outputTokens = 0;
  sessionTotals.costUsd = 0;
}

// ── Beta: Supabase persistence (stubbed, ready to enable) ─────────────────────
//
// async function persistToSupabase(entry) {
//   try {
//     const { supabase } = await import('./supabaseClient');
//     await supabase.from('token_usage').insert([{
//       user_id:       entry.userId,
//       route:         entry.route,
//       model:         entry.model,
//       input_tokens:  entry.inputTokens,
//       output_tokens: entry.outputTokens,
//       cost_usd:      entry.costUsd,
//       duration_ms:   entry.durationMs,
//       claim_type:    entry.claimType,
//       created_at:    entry.timestamp,
//     }]);
//   } catch (err) {
//     console.warn('[tokenTracker] Supabase persist failed:', err.message);
//   }
// }
