import { query } from '../../lib/db.js';
import {
  requireAuth,
  readJsonBody,
  sendJson,
  methodNotAllowed,
  unauthorized,
  badRequest,
  notFound,
  serverError,
} from '../../lib/auth.js';
import { sanitizeClientPayload, mapClientRow } from '../../lib/validators.js';

function getId(req) {
  if (req.query?.id) return parseInt(req.query.id, 10);
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/');
  return parseInt(parts[parts.length - 1], 10);
}

export default async function handler(req, res) {
  try {
    const { authorized } = await requireAuth(req, res);
    if (!authorized) {
      return unauthorized(res);
    }

    const id = getId(req);
    if (Number.isNaN(id)) {
      return badRequest(res, 'ID inválido.');
    }

    if (req.method === 'GET') {
      const result = await query('SELECT * FROM clientes WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        return notFound(res, 'Cliente não encontrado.');
      }
      return sendJson(res, 200, { cliente: mapClientRow(result.rows[0]) });
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      const { data, errors } = sanitizeClientPayload(body, { partial: true });

      if (errors.length) {
        return badRequest(res, errors.join(' '));
      }

      const fields = [];
      const values = [];
      let index = 1;

      for (const key of ['nome', 'projeto', 'url', 'client_id', 'status', 'descricao']) {
        if (data[key] !== undefined) {
          fields.push(`${key} = $${index++}`);
          values.push(data[key]);
        }
      }

      if (fields.length === 0) {
        return badRequest(res, 'Nenhum campo para atualizar.');
      }

      values.push(id);

      try {
        const result = await query(
          `UPDATE clientes SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
          values,
        );

        if (result.rowCount === 0) {
          return notFound(res, 'Cliente não encontrado.');
        }

        return sendJson(res, 200, { cliente: mapClientRow(result.rows[0]) });
      } catch (error) {
        if (error.code === '23505') {
          return badRequest(res, 'CLIENT_ID já cadastrado.');
        }
        throw error;
      }
    }

    if (req.method === 'DELETE') {
      const result = await query(
        'DELETE FROM clientes WHERE id = $1 RETURNING id',
        [id],
      );

      if (result.rowCount === 0) {
        return notFound(res, 'Cliente não encontrado.');
      }

      return sendJson(res, 200, { ok: true });
    }

    return methodNotAllowed(res, ['GET', 'PUT', 'DELETE']);
  } catch (error) {
    serverError(res, error);
  }
}
