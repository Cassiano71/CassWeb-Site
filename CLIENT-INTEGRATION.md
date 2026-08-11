# Integração de Sites de Clientes — Central CassWeb

Este guia explica como conectar um **novo site de cliente** à Central CassWeb para que o status (ATIVO / SUSPENSO) seja controlado centralmente, sem precisar alterar código ou fazer deploy manual a cada suspensão.

---

## Visão geral

```
Central CassWeb (PostgreSQL)
        ↓
GET /api/client/status?client_id=...
        ↓
Site do cliente consulta o status
        ↓
ATIVO    → site normal
SUSPENSO → tela de suspensão
```

---

## 1. Gerar um CLIENT_ID único

O `CLIENT_ID` identifica o site do cliente na Central. Use um identificador curto, único e estável.

**Exemplos válidos:**
- `cliente_001`
- `construfacil`
- `restaurante_x`

**Regras:**
- 3 a 100 caracteres
- Apenas letras, números, `_` e `-`
- Deve ser **único** — não pode repetir outro cliente

> O `CLIENT_ID` definido no site do cliente deve ser **exatamente igual** ao cadastrado na Central.

---

## 2. Configurar variáveis no site do cliente

No projeto do cliente (Vercel, `.env`, ou configuração equivalente), defina:

| Variável | Descrição |
|----------|-----------|
| `CLIENT_ID` | Identificador único do cliente (ex: `cliente_001`) |
| `CENTRAL_API_URL` | URL pública da CassWeb (ex: `https://www.cassweb.com.br`) |

**Exemplo `.env` no site do cliente:**
```
CLIENT_ID=cliente_001
CENTRAL_API_URL=https://www.cassweb.com.br
```

---

## 3. Integrar a consulta de status

Adicione este script no `<head>` do site do cliente, **antes** de qualquer conteúdo visível:

```html
<script>
(function () {
  var CLIENT_ID = 'cliente_001'; // substitua pelo CLIENT_ID real
  var CENTRAL_API_URL = 'https://www.cassweb.com.br'; // substitua pela URL real
  var CACHE_KEY = 'cassweb_status_' + CLIENT_ID;
  var CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  function showSuspended() {
    document.documentElement.innerHTML =
      '<!DOCTYPE html><html lang="pt-BR"><head>' +
      '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Site temporariamente suspenso</title>' +
      '<style>*{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#010e28;color:#eef2fb;font-family:Inter,Segoe UI,sans-serif;padding:24px;text-align:center}' +
      '.box{max-width:420px}.lock{font-size:3rem;margin-bottom:16px}h1{font-size:1.4rem;margin-bottom:12px}p{color:#8998bd;line-height:1.6}</style></head><body>' +
      '<div class="box"><div class="lock">🔒</div><h1>Site temporariamente suspenso</h1>' +
      '<p>Entre em contato com a CassWeb para mais informações.</p></div></body></html>';
  }

  function getCachedStatus() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Date.now() - parsed.time > CACHE_TTL) return null;
      return parsed.status;
    } catch (e) { return null; }
  }

  function setCachedStatus(status) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ status: status, time: Date.now() }));
    } catch (e) { /* ignore */ }
  }

  var cached = getCachedStatus();
  if (cached === 'SUSPENSO') { showSuspended(); return; }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', CENTRAL_API_URL + '/api/client/status?client_id=' + encodeURIComponent(CLIENT_ID), true);
  xhr.timeout = 8000;
  xhr.onload = function () {
    if (xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        setCachedStatus(data.status);
        if (data.status === 'SUSPENSO') showSuspended();
      } catch (e) { /* falha silenciosa — site continua */ }
    }
    // Se API indisponível ou erro: NÃO suspender — site continua normalmente
  };
  xhr.onerror = xhr.ontimeout = function () { /* fail-open: site continua */ };
  xhr.send();
})();
</script>
```

### Comportamento em caso de indisponibilidade da API

**Importante:** Se a API da Central estiver temporariamente fora do ar, o site **continua funcionando normalmente**. Apenas um status confirmado como `SUSPENSO` bloqueia o acesso.

Isso evita que uma falha temporária da Central suspenda indevidamente o site do cliente.

---

## 4. Cadastrar o cliente na Central

Depois de publicar o site do cliente:

1. Acesse a Central CassWeb (`/central`).
2. Clique em **+ NOVO SITE**.
3. Preencha:
   - Nome da empresa
   - Nome do projeto
   - URL do site
   - **ID do cliente** (mesmo `CLIENT_ID` do site)
   - Descrição (opcional)
   - Status inicial: **ATIVO**
4. Salve.

O cliente aparecerá automaticamente na lista da Central.

---

## 5. Testar ATIVO

1. Cadastre o cliente com status **ATIVO**.
2. Acesse o site do cliente.
3. O site deve carregar normalmente.

---

## 6. Testar SUSPENSO

1. Na Central, clique em **Suspender** no cliente.
2. Confirme a ação.
3. Acesse o site do cliente (limpe o cache do navegador ou use aba anônima).
4. Deve aparecer a tela:

   > 🔒 Site temporariamente suspenso  
   > Entre em contato com a CassWeb para mais informações.

---

## 7. Testar REATIVADO

1. Na Central, clique em **Reativar**.
2. Confirme a ação.
3. Acesse o site do cliente novamente.
4. O site deve voltar ao normal.

---

## 8. Endpoint da API

```
GET {CENTRAL_API_URL}/api/client/status?client_id={CLIENT_ID}
```

**Resposta (200):**
```json
{ "status": "ATIVO" }
```
ou
```json
{ "status": "SUSPENSO" }
```

**Resposta (404):** cliente não cadastrado na Central.

A API retorna **somente** o status — nenhum dado administrativo, senha ou informação de outros clientes.

---

## 9. Publicar

1. Configure `CLIENT_ID` e `CENTRAL_API_URL` no site do cliente.
2. Adicione o script de verificação de status.
3. Publique o site (Vercel, etc.).
4. Cadastre o cliente na Central CassWeb.
5. Teste ATIVO → SUSPENSO → REATIVADO.

---

## 10. Checklist rápido

- [ ] `CLIENT_ID` único definido no site e na Central
- [ ] `CENTRAL_API_URL` apontando para a CassWeb em produção
- [ ] Script de status no `<head>` do site
- [ ] Cliente cadastrado na Central
- [ ] Teste de suspensão funcionando
- [ ] Teste de reativação funcionando
- [ ] Fail-open verificado (site continua se API offline)

---

## Suporte

Em caso de dúvidas sobre integração, entre em contato com a CassWeb.
