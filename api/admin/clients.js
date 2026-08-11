import { query } from '../../lib/db.js';
import {
  requireAuth,
  readJsonBody,
  sendJson,
  methodNotAllowed,
  unauthorized,
  badRequest,
  serverError,
} from '../../lib/auth.js';
import { sanitizeClientPayload, mapClientRow } from '../../lib/validators.js';

export default async function handler(req, res) {
  try {
    const { authorized } = await requireAuth(req, res);
    if (!authorized) {
      return unauthorized(res);
    }

    if (req.method === 'GET') {
      const status = req.query?.status;
      let sql = 'SELECT * FROM clientes';
      const params = [];

      if (status && ['ATIVO', 'SUSPENSO'].includes(status)) {
        sql += ' WHERE status = $1';
        params.push(status);
      }

      sql += ' ORDER BY created_at DESC';

      const result = await query(sql, params);
      return sendJson(res, 200, { clientes: result.rows.map(mapClientRow) });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const { data, errors } = sanitizeClientPayload(body);

      if (errors.length) {
        return badRequest(res, errors.join(' '));
      }

      try {
        const result = await query(
          `INSERT INTO clientes (nome, projeto, url, client_id, status, descricao)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [data.nome, data.projeto, data.url, data.client_id, data.status, data.descricao],
        );

        return sendJson(res, 201, { cliente: mapClientRow(result.rows[0]) });
      } catch (error) {
        if (error.code === '23505') {
          return badRequest(res, 'CLIENT_ID já cadastrado.');
        }
        throw error;
      }
    }

    return methodNotAllowed(res, ['GET', 'POST']);
  } catch (error) {
    serverError(res, error);
  }
}
