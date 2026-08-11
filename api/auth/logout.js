import {
  destroySession,
  methodNotAllowed,
  sendJson,
  serverError,
} from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  try {
    await destroySession(req, res);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
}
