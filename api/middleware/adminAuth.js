/**
 * Middleware: require an active admin session.
 * Responds 401 for API calls, redirects to /admin for browser requests.
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminAuthed) {
    return next();
  }
  const wantsJson = req.headers.accept && req.headers.accept.includes('application/json');
  if (wantsJson) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.redirect('/admin');
}

module.exports = { requireAdmin };
