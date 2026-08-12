import { query } from '../../lib/db.js';
import { verifyPassword, DUMMY_PASSWORD_HASH } from '../../lib/password.js';
import {
  getSession,
  readJsonBody,
  sendJson,
  methodNotAllowed,
  serverError,
} from '../../lib/auth.js';
import { validateUsername } from '../../lib/validators.js';
import { getClientIp, rateLimit } from '../../lib/rate-limit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  try {
    const ip = getClientIp(req);
    if (!rateLimit(`login:${ip}`, { windowMs: 60_000, max: 10 })) {
      return sendJson(res, 429, { error: 'Muitas tentativas. Aguarde um minuto.' });
    }

    const body = await readJsonBody(req);
    const username = body.username?.trim();
    const password = body.password;

    const usernameError = validateUsername(username);
    if (usernameError || !password) {
      await verifyPassword(password || '', DUMMY_PASSWORD_HASH);
      return sendJson(res, 401, { error: 'Credenciais incorretas.' });
    }

    const result = await query(
      'SELECT id, nome, username, password_hash, role FROM usuarios_admin WHERE username = $1',
      [username],
    );

    const admin = result.rows[0];
    const valid = await verifyPassword(
      password,
      admin?.password_hash || DUMMY_PASSWORD_HASH,
    );

    if (result.rowCount === 0 || !valid) {
      return sendJson(res, 401, { error: 'Credenciais incorretas.' });
    }

    const session = await getSession(req, res);
    session.adminId = admin.id;
    session.username = admin.username;
    session.nome = admin.nome;
    session.role = admin.role;
    await session.save();

    sendJson(res, 200, {
      ok: true,
      admin: {
        id: admin.id,
        nome: admin.nome,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    serverError(res, error);
  }
}
