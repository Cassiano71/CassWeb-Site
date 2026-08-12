import { getIronSession } from 'iron-session';
import { sessionOptions, ensureSessionSecret } from './session-config.js';
import { query } from './db.js';

export async function getSession(req, res) {
  ensureSessionSecret();
  return getIronSession(req, res, sessionOptions);
}

export async function requireAuth(req, res) {
  const session = await getSession(req, res);

  if (!session.adminId || !session.username) {
    return { authorized: false, session };
  }

  const result = await query(
    'SELECT id FROM usuarios_admin WHERE id = $1 AND username = $2',
    [session.adminId, session.username],
  );

  if (result.rowCount === 0) {
    await session.destroy();
    return { authorized: false, session };
  }

  return { authorized: true, session };
}

export async function destroySession(req, res) {
  const session = await getSession(req, res);
  await session.destroy();
  return session;
}

export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        reject(new Error('Payload muito grande.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

export function methodNotAllowed(res, allowed = []) {
  sendJson(res, 405, { error: 'Método não permitido.', allowed });
}

export function unauthorized(res, message = 'Não autenticado.') {
  sendJson(res, 401, { error: message });
}

export function badRequest(res, message) {
  sendJson(res, 400, { error: message });
}

export function notFound(res, message = 'Recurso não encontrado.') {
  sendJson(res, 404, { error: message });
}

export function serverError(res, error) {
  console.error(error);
  sendJson(res, 500, { error: 'Erro interno do servidor.' });
}
