(function () {
  let clients = [];
  let currentFilter = 'all';
  let confirmCallback = null;
  let authenticated = false;

  const isPreviewMode = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  const els = {
    statClientes: document.getElementById('statClientes'),
    statAtivos: document.getElementById('statAtivos'),
    statSuspensos: document.getElementById('statSuspensos'),
    clientsList: document.getElementById('clientsList'),
    formModal: document.getElementById('formModal'),
    confirmModal: document.getElementById('confirmModal'),
    clientForm: document.getElementById('clientForm'),
    formError: document.getElementById('formError'),
    formModalTitle: document.getElementById('formModalTitle'),
    confirmMessage: document.getElementById('confirmMessage'),
    authBanner: document.getElementById('authBanner'),
  };

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw new Error('Faça login para continuar.');
    }
    if (!res.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
  }

  function showGuestState() {
    els.statClientes.textContent = '0';
    els.statAtivos.textContent = '0';
    els.statSuspensos.textContent = '0';
    els.clientsList.innerHTML = `
      <div class="empty-state">
        <strong>${isPreviewMode ? 'Modo visualização' : 'Painel de clientes'}</strong>
        ${isPreviewMode
          ? 'Clique em "+ Adicionar cliente" para ver o formulário de cadastro.'
          : 'Aqui você verá a lista de clientes. Faça login para carregar os dados.'}
      </div>`;
    if (els.authBanner) {
      if (isPreviewMode) {
        els.authBanner.innerHTML = 'Modo visualização local — você pode testar o formulário de cadastro.';
        els.authBanner.hidden = false;
      } else {
        els.authBanner.hidden = false;
      }
    }
  }

  async function loadStats() {
    const stats = await api('/api/admin/stats');
    els.statClientes.textContent = stats.clientes;
    els.statAtivos.textContent = stats.ativos;
    els.statSuspensos.textContent = stats.suspensos;
  }

  async function loadClients() {
    const query = currentFilter === 'all' ? '' : `?status=${currentFilter}`;
    const data = await api(`/api/admin/clients${query}`);
    clients = data.clientes;
    renderClients();
  }

  function renderClients() {
    if (!clients.length) {
      els.clientsList.innerHTML = `
        <div class="empty-state">
          <strong>Nenhum cliente cadastrado</strong>
          Clique em "+ Adicionar cliente" para cadastrar o primeiro site.
        </div>`;
      return;
    }

    els.clientsList.innerHTML = clients.map((c) => `
      <article class="client-card" data-id="${c.id}">
        <div class="client-info">
          <h3>${escapeHtml(c.nome)}</h3>
          <p class="client-meta">${escapeHtml(c.projeto)}</p>
          <span class="client-id">${escapeHtml(c.client_id)}</span>
          <a class="client-url" href="${escapeAttr(safeHttpUrl(c.url))}" target="_blank" rel="noopener">${escapeHtml(c.url)}</a>
        </div>
        <div class="client-side">
          <span class="status-badge ${c.status === 'ATIVO' ? 'ativo' : 'suspenso'}">${c.status}</span>
          <div class="client-actions">
            <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${c.id}" type="button">Editar</button>
            ${c.status === 'ATIVO'
              ? `<button class="btn btn-warning btn-sm" data-action="suspend" data-id="${c.id}" type="button">Suspender</button>`
              : `<button class="btn btn-success btn-sm" data-action="activate" data-id="${c.id}" type="button">Reativar</button>`}
            <button class="btn btn-danger btn-sm" data-action="delete" data-id="${c.id}" type="button">Excluir</button>
          </div>
        </div>
      </article>
    `).join('');
  }

  function safeHttpUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString();
      }
    } catch (_) { /* ignore */ }
    return '#';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function openModal(modal) {
    modal.hidden = false;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.hidden = true;
  }

  function showConfirm(message, callback) {
    els.confirmMessage.textContent = message;
    confirmCallback = callback;
    openModal(els.confirmModal);
  }

  function openForm(client = null) {
    if (!authenticated && !isPreviewMode) {
      window.location.href = '/central/login';
      return;
    }

    els.formError.classList.remove('visible');
    els.formError.textContent = '';
    els.clientForm.reset();

    if (client) {
      els.formModalTitle.textContent = 'Editar cliente';
      document.getElementById('clientDbId').value = client.id;
      document.getElementById('nome').value = client.nome;
      document.getElementById('projeto').value = client.projeto;
      document.getElementById('url').value = client.url;
      document.getElementById('client_id').value = client.client_id;
      document.getElementById('descricao').value = client.descricao || '';
      document.getElementById('status').value = client.status;
    } else {
      els.formModalTitle.textContent = 'Adicionar cliente';
      document.getElementById('clientDbId').value = '';
      document.getElementById('status').value = 'ATIVO';
    }

    openModal(els.formModal);
  }

  document.getElementById('btnNewClient').addEventListener('click', () => openForm());

  document.getElementById('btnCancelForm').addEventListener('click', () => closeModal(els.formModal));

  document.getElementById('btnConfirmCancel').addEventListener('click', () => {
    confirmCallback = null;
    closeModal(els.confirmModal);
  });

  document.getElementById('btnConfirmOk').addEventListener('click', async () => {
    if (confirmCallback) await confirmCallback();
    confirmCallback = null;
    closeModal(els.confirmModal);
  });

  document.getElementById('btnLogout').addEventListener('click', async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (_) { /* ignore */ }
    window.location.href = '/central/login';
  });

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!authenticated) return;
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      loadClients();
    });
  });

  els.clientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.formError.classList.remove('visible');

    if (!authenticated && isPreviewMode) {
      els.formError.textContent = 'Modo visualização — o cadastro real funcionará após publicar, configurar o banco e fazer login.';
      els.formError.classList.add('visible');
      return;
    }

    if (!authenticated) {
      window.location.href = '/central/login';
      return;
    }

    const id = document.getElementById('clientDbId').value;
    const payload = {
      nome: document.getElementById('nome').value.trim(),
      projeto: document.getElementById('projeto').value.trim(),
      url: document.getElementById('url').value.trim(),
      client_id: document.getElementById('client_id').value.trim(),
      descricao: document.getElementById('descricao').value.trim() || null,
      status: document.getElementById('status').value,
    };

    try {
      if (id) {
        await api(`/api/admin/clients/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/api/admin/clients', { method: 'POST', body: JSON.stringify(payload) });
      }
      closeModal(els.formModal);
      await Promise.all([loadStats(), loadClients()]);
    } catch (err) {
      els.formError.textContent = err.message;
      els.formError.classList.add('visible');
    }
  });

  els.clientsList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !authenticated) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const client = clients.find((c) => String(c.id) === String(id));
    if (!client) return;

    if (action === 'edit') {
      openForm(client);
      return;
    }

    if (action === 'suspend') {
      showConfirm(`Suspender o site de "${client.nome}"? O visitante verá a tela de suspensão.`, async () => {
        await api(`/api/admin/clients/${id}/suspend`, { method: 'PATCH' });
        await Promise.all([loadStats(), loadClients()]);
      });
      return;
    }

    if (action === 'activate') {
      showConfirm(`Reativar o site de "${client.nome}"? O site voltará ao normal.`, async () => {
        await api(`/api/admin/clients/${id}/activate`, { method: 'PATCH' });
        await Promise.all([loadStats(), loadClients()]);
      });
      return;
    }

    if (action === 'delete') {
      showConfirm(`Excluir "${client.nome}" permanentemente? Esta ação não pode ser desfeita.`, async () => {
        await api(`/api/admin/clients/${id}`, { method: 'DELETE' });
        await Promise.all([loadStats(), loadClients()]);
      });
    }
  });

  [els.formModal, els.confirmModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  (async function init() {
    try {
      await api('/api/auth/me');
      authenticated = true;
      if (els.authBanner) els.authBanner.hidden = true;
      await Promise.all([loadStats(), loadClients()]);
    } catch {
      authenticated = false;
      showGuestState();
    }
  })();
})();
