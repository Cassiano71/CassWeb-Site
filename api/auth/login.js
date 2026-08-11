import { query } from '../../lib/db.js';
import { verifyPassword } from '../../lib/password.js';
import {
  getSession,
  readJsonBody,
  sendJson,
  methodNotAllowed,
  badRequest,
  serverError,
} from '../../lib/auth.js';
import { validateUsername } from '../../lib/validators.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  try {
    const body = await readJsonBody(req);
    const username = body.username?.trim();
    const password = body.password;

    const usernameError = validateUsername(username);
    if (usernameError || !password) {
      return badRequest(res, 'Usuário ou senha inválidos.');
    }

    const result = await query(
      'SELECT id, nome, username, password_hash, role FROM usuarios_admin WHERE username = $1',
      [username],
    );

    if (result.rowCount === 0) {
      return sendJson(res, 401, { error: 'Credenciais incorretas.' });
    }

    const admin = result.rows[0];
    const valid = await verifyPassword(password, admin.password_hash);

    if (!valid) {
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
