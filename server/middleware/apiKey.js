// server/middleware/apiKey.js
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.X_API_KEY;

/**
 * Middleware that validates the X-API-KEY header.
 * Returns 401 if missing or invalid.
 */
export default function apiKeyMiddleware(req, res, next) {
  const key = req.header('X-API-KEY');
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}
