/**
 * Auth utilities for Vercel serverless.
 * Uses JWT in HTTP-only cookies instead of express-session
 * (sessions don't persist across cold starts in serverless).
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'pegangind_fallback_secret_change_in_production';
const COOKIE_NAME = 'pg_auth';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Read auth from request cookies (for API handlers).
 */
function getAuthFromCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.split(';').find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const token = match.split('=').slice(1).join('=').trim();
  return verifyToken(token);
}

/**
 * Set auth cookie (for login handler).
 */
function setAuthCookie(res, payload) {
  const token = signToken(payload);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(COOKIE_MAX_AGE / 1000)}${process.env.VERCEL === 'true' ? '; Secure' : ''}`);
}

/**
 * Clear auth cookie (for logout handler).
 */
function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

/**
 * Require auth middleware for Vercel API handlers.
 * Returns { authorized: true, userId, username } or sends 401.
 */
function requireAdminAuth(req) {
  const payload = getAuthFromCookies(req);
  if (!payload || !payload.userId) {
    return null;
  }
  return payload;
}

module.exports = { signToken, verifyToken, getAuthFromCookies, setAuthCookie, clearAuthCookie, requireAdminAuth, COOKIE_NAME };
