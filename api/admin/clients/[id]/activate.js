import { query } from '../../../lib/db.js';
import {
  requireAuth,
  sendJson,
  methodNotAllowed,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '../../../lib/auth.js';
import { mapClientRow } from '../../../lib/validators.js';

function getId(req) {
  if (req.query?.id) return parseInt(req.query.id, 10);
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/');
  const actionIndex = parts.indexOf('clients') + 1;
  return parseInt(parts[actionIndex], 10);
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return methodNotAllowed(res, ['PATCH']);
  }

  try {
    const { authorized } = await requireAuth(req, res);
    if (!authorized) {
      return unauthorized(res);
    }

    const id = getId(req);
    if (Number.isNaN(id)) {
      return badRequest(res, 'ID inválido.');
    }

    const result = await query(
      "UPDATE clientes SET status = 'ATIVO' WHERE id = $1 RETURNING *",
      [id],
    );

    if (result.rowCount === 0) {
      return notFound(res, 'Cliente não encontrado.');
    }

    sendJson(res, 200, { cliente: mapClientRow(result.rows[0]) });
  } catch (error) {
    serverError(res, error);
  }
}
