function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

function resolveSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (isProductionRuntime()) {
    if (!secret || secret.length < 32) {
      throw new Error('SESSION_SECRET deve ter no mínimo 32 caracteres.');
    }
    return secret;
  }
  return secret || 'development-only-secret-min-32-chars!!';
}

export const sessionOptions = {
  password: resolveSessionSecret(),
  cookieName: 'cassweb_admin_session',
  cookieOptions: {
    secure: isProductionRuntime(),
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  },
};

export function ensureSessionSecret() {
  if (!isProductionRuntime()) return;
  resolveSessionSecret();
}
