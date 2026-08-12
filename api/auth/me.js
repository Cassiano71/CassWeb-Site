import { query } from '../../lib/db.js';
import {
  requireAuth,
  methodNotAllowed,
  sendJson,
  unauthorized,
  serverError,
} from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  try {
    const { authorized, session } = await requireAuth(req, res);
    if (!authorized) {
      return unauthorized(res);
    }

    const result = await query(
      'SELECT id, nome, username, role FROM usuarios_admin WHERE id = $1',
      [session.adminId],
    );

    if (result.rowCount === 0) {
      await session.destroy();
      return unauthorized(res, 'Sessão inválida.');
    }

    sendJson(res, 200, { authenticated: true, admin: result.rows[0] });
  } catch (error) {
    serverError(res, error);
  }
}
