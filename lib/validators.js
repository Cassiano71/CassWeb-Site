const CLIENT_ID_REGEX = /^[a-zA-Z0-9_-]{3,100}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,100}$/;

export function validateClientId(clientId) {
  if (!clientId || typeof clientId !== 'string') {
    return 'CLIENT_ID é obrigatório.';
  }
  const trimmed = clientId.trim();
  if (!CLIENT_ID_REGEX.test(trimmed)) {
    return 'CLIENT_ID deve conter 3–100 caracteres (letras, números, _ ou -).';
  }
  return null;
}

export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return 'Usuário é obrigatório.';
  }
  const trimmed = username.trim();
  if (!USERNAME_REGEX.test(trimmed)) {
    return 'Usuário inválido. Use 3–100 caracteres (letras, números, ., _ ou -).';
  }
  return null;
}

export function validateStatus(status) {
  if (!['ATIVO', 'SUSPENSO'].includes(status)) {
    return 'Status deve ser ATIVO ou SUSPENSO.';
  }
  return null;
}

export function sanitizeClientPayload(body, { partial = false } = {}) {
  const errors = [];
  const data = {};

  const requireField = (field, label, maxLen) => {
    const value = body[field];
    if (partial && (value === undefined || value === null)) return;
    if (!value || typeof value !== 'string' || !value.trim()) {
      errors.push(`${label} é obrigatório.`);
      return;
    }
    const trimmed = value.trim();
    if (trimmed.length > maxLen) {
      errors.push(`${label} excede ${maxLen} caracteres.`);
      return;
    }
    data[field] = trimmed;
  };

  requireField('nome', 'Nome da empresa', 255);
  requireField('projeto', 'Nome do projeto', 255);
  requireField('url', 'URL do site', 500);
  requireField('client_id', 'ID do cliente', 100);

  if (body.client_id !== undefined || !partial) {
    const clientIdError = validateClientId(body.client_id);
    if (clientIdError) errors.push(clientIdError);
  }

  if (body.url !== undefined || !partial) {
    try {
      const url = new URL(body.url?.trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('URL deve começar com http:// ou https://');
      } else {
        data.url = url.toString();
      }
    } catch {
      if (body.url !== undefined || !partial) {
        errors.push('URL inválida.');
      }
    }
  }

  if (body.descricao !== undefined) {
    if (body.descricao === null || body.descricao === '') {
      data.descricao = null;
    } else if (typeof body.descricao === 'string') {
      data.descricao = body.descricao.trim().slice(0, 2000);
    } else {
      errors.push('Descrição inválida.');
    }
  } else if (!partial) {
    data.descricao = null;
  }

  if (body.status !== undefined) {
    const statusError = validateStatus(body.status);
    if (statusError) errors.push(statusError);
    else data.status = body.status;
  } else if (!partial) {
    data.status = 'ATIVO';
  }

  return { data, errors };
}

export function mapClientRow(row) {
  return {
    id: row.id,
    nome: row.nome,
    projeto: row.projeto,
    url: row.url,
    client_id: row.client_id,
    status: row.status,
    descricao: row.descricao,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapAdminPublic(row) {
  return {
    id: row.id,
    nome: row.nome,
    username: row.username,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
