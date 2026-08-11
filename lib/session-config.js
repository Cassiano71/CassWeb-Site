export const sessionOptions = {
  password: process.env.SESSION_SECRET || 'development-only-secret-min-32-chars!!',
  cookieName: 'cassweb_admin_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  },
};

export function ensureSessionSecret() {
  if (process.env.NODE_ENV !== 'production') return;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET deve ter no mínimo 32 caracteres.');
  }
}
