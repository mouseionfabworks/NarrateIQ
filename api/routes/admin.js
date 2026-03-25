const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireAdmin } = require('../middleware/adminAuth');
const supabase = require('../lib/supabase');

// Cost per 1M tokens (approximate, adjust as needed)
const COST_PER_1M_INPUT = 3.0;   // USD
const COST_PER_1M_OUTPUT = 15.0; // USD

// ─── Auth ─────────────────────────────────────────────────────────────────────

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD env var not set' });
  }
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.adminAuthed = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  res.json({ authed: !!(req.session && req.session.adminAuthed) });
});

// ─── Access Codes ─────────────────────────────────────────────────────────────

router.get('/codes', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('access_codes')
    .select('id, code, created_at, is_active, used_by, used_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/codes/generate', requireAdmin, async (req, res) => {
  const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char alphanumeric

  const { data, error } = await supabase
    .from('access_codes')
    .insert({ code, is_active: true })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/codes/revoke', requireAdmin, async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const { error } = await supabase
    .from('access_codes')
    .update({ is_active: false })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ─── Beta Users ───────────────────────────────────────────────────────────────

router.get('/users', requireAdmin, async (req, res) => {
  // Use service role to list auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authError) return res.status(500).json({ error: authError.message });

  // Fetch last_active from profiles if available
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, last_active');

  const profileMap = {};
  if (profiles) profiles.forEach(p => { profileMap[p.id] = p.last_active; });

  const users = authData.users.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_active: profileMap[u.id] || u.last_sign_in_at || null,
  }));

  res.json(users);
});

// ─── Usage ────────────────────────────────────────────────────────────────────

router.get('/usage', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('narrative_sessions')
    .select('user_id, feedback_type, created_at');

  if (error) return res.status(500).json({ error: error.message });

  // Aggregate per user
  const byUser = {};
  for (const row of data) {
    if (!byUser[row.user_id]) {
      byUser[row.user_id] = { user_id: row.user_id, total: 0, ready: 0, needed_edits: 0, not_usable: 0 };
    }
    byUser[row.user_id].total++;
    const ft = (row.feedback_type || '').toLowerCase().replace(/\s+/g, '_');
    if (ft === 'ready') byUser[row.user_id].ready++;
    else if (ft === 'needed_edits') byUser[row.user_id].needed_edits++;
    else if (ft === 'not_usable') byUser[row.user_id].not_usable++;
  }

  res.json(Object.values(byUser));
});

// ─── Token / Cost ─────────────────────────────────────────────────────────────

router.get('/tokens', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('token_logs')
    .select('user_id, tokens_in, tokens_out, created_at');

  if (error) {
    // token_logs may not exist yet (Ticket 015 dependency)
    if (error.code === '42P01') {
      return res.json({ rows: [], totals: { tokens_in: 0, tokens_out: 0, cost_usd: 0 } });
    }
    return res.status(500).json({ error: error.message });
  }

  const byUser = {};
  let totalIn = 0, totalOut = 0;

  for (const row of data) {
    if (!byUser[row.user_id]) {
      byUser[row.user_id] = { user_id: row.user_id, tokens_in: 0, tokens_out: 0, cost_usd: 0 };
    }
    byUser[row.user_id].tokens_in += row.tokens_in || 0;
    byUser[row.user_id].tokens_out += row.tokens_out || 0;
    totalIn += row.tokens_in || 0;
    totalOut += row.tokens_out || 0;
  }

  // Calculate cost per user
  for (const u of Object.values(byUser)) {
    u.cost_usd = (u.tokens_in / 1_000_000) * COST_PER_1M_INPUT
               + (u.tokens_out / 1_000_000) * COST_PER_1M_OUTPUT;
    u.cost_usd = Math.round(u.cost_usd * 10000) / 10000;
  }

  const totalCost = (totalIn / 1_000_000) * COST_PER_1M_INPUT
                  + (totalOut / 1_000_000) * COST_PER_1M_OUTPUT;

  res.json({
    rows: Object.values(byUser),
    totals: {
      tokens_in: totalIn,
      tokens_out: totalOut,
      cost_usd: Math.round(totalCost * 10000) / 10000,
    },
  });
});

module.exports = router;
