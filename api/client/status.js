import { query } from '../../lib/db.js';
import {
  sendJson,
  methodNotAllowed,
  badRequest,
  notFound,
  serverError,
} from '../../lib/auth.js';
import { validateClientId } from '../../lib/validators.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');

  try {
    const url = new URL(req.url, 'http://localhost');
    const clientId = url.searchParams.get('client_id')?.trim();

    const clientIdError = validateClientId(clientId);
    if (clientIdError) {
      return badRequest(res, clientIdError);
    }

    const result = await query(
      'SELECT status FROM clientes WHERE client_id = $1',
      [clientId],
    );

    if (result.rowCount === 0) {
      return notFound(res, 'Cliente não encontrado.');
    }

    sendJson(res, 200, { status: result.rows[0].status });
  } catch (error) {
    serverError(res, error);
  }
}
