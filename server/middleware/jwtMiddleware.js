// server/middleware/jwtMiddleware.js
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

const getBearerToken = (req) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

async function validateSupabaseToken(req, res, next, allowAnonymous = false) {
  const token = getBearerToken(req);

  if (!token) {
    if (allowAnonymous) {
      req.user = null;
      return next();
    }
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      if (allowAnonymous) {
        req.user = null;
        return next();
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: user.id,
      sub: user.id,
      email: user.email,
      ...user,
    };
    return next();
  } catch (err) {
    if (allowAnonymous) {
      req.user = null;
      return next();
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export default function jwtMiddleware(req, res, next) {
  return validateSupabaseToken(req, res, next, false);
}

export function optionalJwtMiddleware(req, res, next) {
  return validateSupabaseToken(req, res, next, true);
}
