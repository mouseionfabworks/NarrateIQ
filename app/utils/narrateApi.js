// app/utils/narrateApi.js
// Ticket 014: LLM-based claim type detection via /api/detect-claim-type
// Ticket 015: token tracking instrumentation on every call

import { getApiBaseUrl } from './apiConfig';
import { SYSTEM_PROMPT, WATER_MODULE, STORM_MODULE, GENERAL_MODULE } from '../constants/prompts';
import { detectClaimTypeSync } from './detectClaimType';
import { supabase } from './supabaseClient';
import { recordCall } from './tokenTracker';

const DETECT_MODEL   = 'claude-haiku-4-5-20251001';
const REVIEW_MODEL   = 'claude-haiku-4-5-20251001';
const GENERATE_MODEL = 'claude-haiku-4-5-20251001';

function getDepthModule(claimType) {
  switch (claimType) {
    case 'water': return WATER_MODULE;
    case 'storm': return STORM_MODULE;
    default:      return GENERAL_MODULE;
  }
}

function buildSystemPrompt(claimType) {
  return SYSTEM_PROMPT + '\n\n' + getDepthModule(claimType);
}

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('No active session — please sign in again.');
  return session.access_token;
}

async function getUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// Core POST helper — returns { data, durationMs }
async function postToBackend(path, body) {
  const baseUrl = getApiBaseUrl();
  const token   = await getAuthToken();
  const startMs = Date.now();

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error ?? `Server error ${response.status}`);
  }

  const data = await response.json();
  return { data, durationMs };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Ticket 014 — LLM-based claim type detection.
 * Returns:
 * {
 *   claimTypeId:        string
 *   confidence:         number
 *   needsClarification: boolean
 *   clarifyQuestion:    string | null
 * }
 *
 * Callers should check needsClarification before proceeding to review.
 * If true, show clarifyQuestion to the adjuster and re-call with their answer appended.
 */
export async function detectClaimType(notes) {
  if (!notes?.trim()) {
    return { claimTypeId: 'general', confidence: 1, needsClarification: false, clarifyQuestion: null };
  }

  try {
    const { data, durationMs } = await postToBackend('/api/detect-claim-type', { notes });

    // Track token usage for detection call
    if (data.usage) {
      const userId = await getUserId();
      recordCall({
        route:        '/api/detect-claim-type',
        model:        DETECT_MODEL,
        inputTokens:  data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        durationMs,
        claimType:    data.claimTypeId ?? 'general',
        userId,
      });
    }

    return {
      claimTypeId:        data.claimTypeId        ?? 'general',
      confidence:         data.confidence         ?? 0,
      needsClarification: data.needsClarification ?? false,
      clarifyQuestion:    data.clarifyQuestion    ?? null,
    };
  } catch (err) {
    console.warn('[narrateApi] detectClaimType failed, using sync fallback:', err.message);
    return {
      claimTypeId:        detectClaimTypeSync(notes),
      confidence:         0.5,
      needsClarification: false,
      clarifyQuestion:    null,
    };
  }
}

export async function reviewNotes(notes, outputMode, claimType) {
  try {
    const { data, durationMs } = await postToBackend('/api/review', {
      notes,
      outputMode,
      claimType,
      systemPrompt: buildSystemPrompt(claimType),
    });

    if (data.usage) {
      const userId = await getUserId();
      recordCall({
        route:        '/api/review',
        model:        REVIEW_MODEL,
        inputTokens:  data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        durationMs,
        claimType,
        userId,
      });
    }

    return data;
  } catch (error) {
    console.error('[narrateApi] reviewNotes error:', error.message);
    return { status: 'error', message: error.message };
  }
}

export async function generateDraft(notes, answers, outputMode, claimType) {
  try {
    const { data, durationMs } = await postToBackend('/api/generate', {
      notes,
      answers,
      outputMode,
      claimType,
      systemPrompt: buildSystemPrompt(claimType),
    });

    if (data.usage) {
      const userId = await getUserId();
      recordCall({
        route:        '/api/generate',
        model:        GENERATE_MODEL,
        inputTokens:  data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        durationMs,
        claimType,
        userId,
      });
    }

    return data;
  } catch (error) {
    console.error('[narrateApi] generateDraft error:', error.message);
    return { status: 'error', message: error.message };
  }
}
