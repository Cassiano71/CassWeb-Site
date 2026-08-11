export const config = {
  matcher: ['/central', '/central/:path*'],
};

function hasAdminSession(request) {
  const cookies = request.headers.get('cookie') || '';
  return cookies.includes('cassweb_admin_session=');
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
