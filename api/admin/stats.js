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
    const { authorized } = await requireAuth(req, res);
    if (!authorized) {
      return unauthorized(res);
    }

    const [total, ativos, suspensos] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM clientes'),
      query("SELECT COUNT(*)::int AS count FROM clientes WHERE status = 'ATIVO'"),
      query("SELECT COUNT(*)::int AS count FROM clientes WHERE status = 'SUSPENSO'"),
    ]);

    sendJson(res, 200, {
      clientes: total.rows[0].count,
      ativos: ativos.rows[0].count,
      suspensos: suspensos.rows[0].count,
    });
  } catch (error) {
    serverError(res, error);
  }
}
