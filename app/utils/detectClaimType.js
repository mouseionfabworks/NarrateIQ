// app/utils/detectClaimType.js
// Ticket 014 — LLM-based claim type detection.
// Replaces keyword matching. Works in any language.
//
// Returns a result object, not just a string ID, so callers can handle
// low-confidence cases with a clarifying question before proceeding.
//
// For backwards compatibility, detectClaimTypeSync() is kept as a fast
// keyword fallback used only when no auth session exists (edge case).

import { claimTypes } from '../constants/claimTypes';

// ── Sync fallback (keyword-based, English only) ───────────────────────────────
// Used as emergency fallback only. Do not call directly in normal flow.

export function detectClaimTypeSync(text) {
  if (!text) return 'general';
  const lower = text.toLowerCase();
  for (const claimType of claimTypes) {
    if (claimType.id === 'general') continue;
    for (const keyword of claimType.keywords) {
      if (lower.includes(keyword)) return claimType.id;
    }
  }
  return 'general';
}

// ── Async LLM detection (primary path) ────────────────────────────────────────
// Returns:
// {
//   claimTypeId:        string   — one of: water | storm | fire | mold | general
//   confidence:         number   — 0.0 to 1.0
//   needsClarification: boolean  — true when confidence < 0.75
//   clarifyQuestion:    string | null
// }

export async function detectClaimTypeAsync(notes, postToBackend) {
  if (!notes?.trim()) {
    return {
      claimTypeId: 'general',
      confidence: 1,
      needsClarification: false,
      clarifyQuestion: null,
    };
  }

  try {
    const result = await postToBackend('/api/detect-claim-type', { notes });
    return result;
  } catch (err) {
    console.warn('[detectClaimType] LLM detection failed, using sync fallback:', err.message);
    return {
      claimTypeId: detectClaimTypeSync(notes),
      confidence: 0.5,
      needsClarification: false,
      clarifyQuestion: null,
    };
  }
}

// Keep default export as sync for any legacy callers during transition
export default detectClaimTypeSync;
