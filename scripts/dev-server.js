import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;

loadEnvFile();

const REWRITES = {
  '/central/login': '/central/login.html',
  '/central': '/central/index.html',
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

function loadEnvFile() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseQuery(url) {
  const q = {};
  for (const [k, v] of url.searchParams) q[k] = v;
  return q;
}

async function resolveApiHandler(pathname) {
  const relative = pathname.replace(/^\/api\//, '');
  const segments = relative.split('/').filter(Boolean);

  const candidates = [];

  if (segments.length >= 3 && segments[0] === 'admin' && segments[1] === 'clients') {
    const id = segments[2];
    const action = segments[3];
    if (action === 'suspend') {
      candidates.push('api/admin/clients/[id]/suspend.js');
    } else if (action === 'activate') {
      candidates.push('api/admin/clients/[id]/activate.js');
    } else if (id && !Number.isNaN(Number(id))) {
      candidates.push('api/admin/clients/[id].js');
    }
  }

  candidates.push(`api/${segments.join('/')}.js`);
  candidates.push(`api/${relative}.js`);

  for (const candidate of candidates) {
    const full = path.join(ROOT, candidate);
    if (fs.existsSync(full)) {
      const mod = await import(`file://${full}`);
      return { handler: mod.default, file: candidate };
    }
  }

  return null;
}

async function handleApi(req, res, url) {
  const resolved = await resolveApiHandler(url.pathname);
  if (!resolved?.handler) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Endpoint não encontrado.' }));
    return;
  }

  req.query = parseQuery(url);

  const idMatch = url.pathname.match(/\/clients\/(\d+)/);
  if (idMatch) req.query.id = idMatch[1];

  try {
    await resolved.handler(req, res);
  } catch (error) {
    console.error('[API]', url.pathname, error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Erro interno do servidor.' }));
    }
  }
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(ROOT, pathname.replace(/^\//, ''));

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 — Página não encontrada</h1>');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith('/api/')) {
    await handleApi(req, res, url);
    return;
  }

  if (pathname === '/central') {
    res.writeHead(302, { Location: '/central/index.html' });
    res.end();
    return;
  }

  if (pathname === '/central/login' || pathname === '/central/login/') {
    res.writeHead(302, { Location: '/central/login.html' });
    res.end();
    return;
  }

  if (REWRITES[pathname]) {
    pathname = REWRITES[pathname];
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  CassWeb — servidor local');
  console.log(`  Site:  http://localhost:${PORT}`);
  console.log(`  Login: http://localhost:${PORT}/central/login`);
  console.log('');
  if (!process.env.DATABASE_URL) {
    console.log('  ⚠ DATABASE_URL não definida — configure .env para o login funcionar.');
  }
  console.log('');
});
