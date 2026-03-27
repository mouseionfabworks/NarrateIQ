// api/index.js
// NarrateIQ backend
// Ticket 014: LLM-based claim type detection
// Ticket 015: usage forwarded in every response
// Ticket 017: max_tokens bumped on /api/generate to accommodate coaching block
//
// Deploy: Railway (https://railway.app)
// Env vars required in Railway dashboard:
//   ANTHROPIC_API_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   PORT (Railway sets this automatically)

import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50kb' }));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DETECT_MODEL   = 'claude-haiku-4-5-20251001';
const REVIEW_MODEL   = 'claude-haiku-4-5-20251001';
const GENERATE_MODEL = 'claude-haiku-4-5-20251001';

// ── Auth ──────────────────────────────────────────────────────────────────────

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Auth validation failed' });
  }
}

function stripFences(text) {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

function logUsage(route, usage, userId) {
  console.log(`[usage] ${route} | user:${userId} | in:${usage?.input_tokens} out:${usage?.output_tokens}`);
}

// ── Health ─────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'narrateiq-api', ts: new Date().toISOString() });
});

// ── POST /api/detect-claim-type ────────────────────────────────────────────────

app.post('/api/detect-claim-type', requireAuth, async (req, res) => {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: 'notes is required' });

  const systemPrompt = `You are a claim type classifier for a property insurance adjuster tool.

Classify the adjuster's field notes into exactly one of these claim types:
- water
- storm
- fire
- mold
- general

Rules:
- Respond with strict valid JSON only. No markdown, no prose.
- Input may be in any language. Classify based on meaning, not keywords.
- "general" is the fallback for anything unclear or unrecognized.
- confidence is a float from 0.0 to 1.0 reflecting certainty.
- If confidence is below 0.75, set needsClarification to true and write a single plain-language clarifyQuestion in English asking the adjuster what type of loss this is.
- If confidence is 0.75 or above, set needsClarification to false and clarifyQuestion to null.

Response schema:
{
  "claimTypeId": "water" | "storm" | "fire" | "mold" | "general",
  "confidence": 0.0,
  "needsClarification": false,
  "clarifyQuestion": "string or null"
}`;

  try {
    const message = await anthropic.messages.create({
      model: DETECT_MODEL,
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Classify these adjuster notes:\n\n${notes}` }],
    });

    logUsage('/api/detect-claim-type', message.usage, req.user.id);
    const parsed = JSON.parse(stripFences(message.content[0].text));
    const validTypes = ['water', 'storm', 'fire', 'mold', 'general'];
    if (!validTypes.includes(parsed.claimTypeId)) parsed.claimTypeId = 'general';
    return res.json({ ...parsed, usage: message.usage });
  } catch (err) {
    console.error('[/api/detect-claim-type] error:', err.message);
    return res.json({
      claimTypeId: 'general',
      confidence: 0,
      needsClarification: false,
      clarifyQuestion: null,
    });
  }
});

// ── POST /api/review ───────────────────────────────────────────────────────────

app.post('/api/review', requireAuth, async (req, res) => {
  const { notes, outputMode, claimType, systemPrompt } = req.body;
  if (!notes || !systemPrompt) {
    return res.status(400).json({ error: 'notes and systemPrompt are required' });
  }

  const userPrompt =
    'Review the following adjuster notes.\n' +
    'Detected claim type: ' + claimType + '\n' +
    'Evaluate against the active depth module.\n' +
    'If incomplete: return status needs_clarification with missing_items and questions (max 5).\n' +
    'If sufficient: return status ready with draft.\n' +
    'Requested output_mode: ' + outputMode + '\n' +
    'Notes:\n' + notes;

  try {
    const message = await anthropic.messages.create({
      model: REVIEW_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    logUsage('/api/review', message.usage, req.user.id);
    const parsed = JSON.parse(stripFences(message.content[0].text));
    return res.json({ ...parsed, usage: message.usage });
  } catch (err) {
    console.error('[/api/review] error:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── POST /api/generate ─────────────────────────────────────────────────────────
// max_tokens bumped to 2500 to accommodate Ticket 017 coaching block

app.post('/api/generate', requireAuth, async (req, res) => {
  const { notes, answers, outputMode, claimType, systemPrompt } = req.body;
  if (!notes || !systemPrompt) {
    return res.status(400).json({ error: 'notes and systemPrompt are required' });
  }

  const formattedAnswers = (answers ?? [])
    .map((a) => 'Question: ' + a.question + '\nAnswer: ' + a.answer)
    .join('\n\n');

  const userPrompt =
    'Using the original notes and follow-up answers, produce professional claim documentation.\n' +
    'Detected claim type: ' + claimType + '\n' +
    'Set status to ready.\n' +
    'Set questions to empty array.\n' +
    'Output format: ' + outputMode + '\n' +
    'Return strict JSON only.\n\n' +
    'Original notes:\n' + notes + '\n\n' +
    'Follow-up answers:\n' + formattedAnswers;

  try {
    const message = await anthropic.messages.create({
      model: GENERATE_MODEL,
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    logUsage('/api/generate', message.usage, req.user.id);
    const parsed = JSON.parse(stripFences(message.content[0].text));
    return res.json({ ...parsed, usage: message.usage });
  } catch (err) {
    console.error('[/api/generate] error:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`NarrateIQ API running on port ${PORT}`));
