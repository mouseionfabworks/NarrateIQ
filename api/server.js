require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
}));

// Health check FIRST (before static files)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve admin static files
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

// Admin API routes
app.use('/admin', adminRouter);

// Start server - CRITICAL: Bind to 0.0.0.0 for Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`NarrateIQ API running on port ${PORT}`);
});