(function () {
  const form = document.getElementById('loginForm');
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  function centralHome() {
    return '/central/index.html';
  }

  try {
    fetch('/api/auth/me', { credentials: 'same-origin' }).then(function (session) {
      if (session.ok) window.location.href = centralHome();
    }).catch(function () {});
  } catch (_) {}

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorEl.classList.remove('visible');
    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: document.getElementById('username').value.trim(),
          password: document.getElementById('password').value,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        errorEl.textContent = data.error || 'Credenciais incorretas.';
        errorEl.classList.add('visible');
        return;
      }

      window.location.href = centralHome();
    } catch {
      errorEl.textContent = 'Erro de conexão. Tente novamente.';
      errorEl.classList.add('visible');
    } finally {
      btn.disabled = false;
      btn.textContent = 'ENTRAR';
    }
  });
})();
