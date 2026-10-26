const secretStr = process.env.AUTH_SECRET;

if (process.env.NODE_ENV === 'production' && (!secretStr || secretStr.length < 32)) {
  throw new Error('FATAL SECURITY ERROR: AUTH_SECRET environment variable is missing or shorter than 32 characters.');
}

export const JWT_SECRET = new TextEncoder().encode(
  secretStr || 'ev_dev_sec_fallback_minimum_32_characters_strictly_for_local_env_2026'
);

export const COOKIE_NAME = 'ev_session';
