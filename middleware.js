export const config = {
  matcher: ['/central', '/central/:path*'],
};

function hasAdminSession(request) {
  const cookies = request.headers.get('cookie') || '';
  const match = cookies.match(/(?:^|;\s*)cassweb_admin_session=([^;]*)/);
  if (!match) return false;

  let value = match[1].trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return false;
  }

  return value.startsWith('Fe26.') && value.length >= 80;
}

export default function middleware(request) {
  const { pathname } = new URL(request.url);

  const isPublic =
    pathname === '/central/login' ||
    pathname === '/central/login.html' ||
    pathname.startsWith('/central/login/') ||
    /\.(css|js|png|jpg|jpeg|webp|ico|svg|woff2?)$/i.test(pathname);

  if (isPublic) return;

  if (pathname === '/central' || pathname.startsWith('/central/')) {
    if (!hasAdminSession(request)) {
      return Response.redirect(new URL('/central/login', request.url), 302);
    }
  }
}
