// server/controllers/authController.js
import { supabaseAdmin } from '../../src/utils/supabaseClient.js';

const buildUserPayload = (user) => ({
  id: user?.id,
  email: user?.email,
  nome: user?.user_metadata?.nome || user?.email?.split('@')[0] || null,
});

/**
 * Sign up a new user using Supabase Auth (email & password).
 * Returns the Supabase session so the frontend can store the access token.
 */
export async function signup(req, res) {
  const { email, password, nome } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome: nome || email.split('@')[0],
      },
    });

    if (createError) throw createError;

    const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw signInError;

    const user = buildUserPayload(sessionData.user);

    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: sessionData.user.id,
        email: sessionData.user.email,
        nome: user.nome,
      }, { onConflict: 'id' })
      .select();

    return res.status(201).json({
      user,
      session: sessionData.session,
      access_token: sessionData.session?.access_token,
      refresh_token: sessionData.session?.refresh_token,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Log in an existing user via Supabase Auth.
 * Returns the access token to be sent in Authorization header.
 */
export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data: sessionData, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return res.json({
      user: buildUserPayload(sessionData.user),
      session: sessionData.session,
      access_token: sessionData.session?.access_token,
      refresh_token: sessionData.session?.refresh_token,
    });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
}
