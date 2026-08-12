import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/** Hash fixo para equalizar tempo de resposta quando o usuário não existe. */
export const DUMMY_PASSWORD_HASH =
  '$2a$12$P.tSQVlK5HgLUgvx6e0eeeGan/Gygt0XsjsxEFLT8qi2A8MOBQ/lG';

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

export function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return 'A senha deve ter no mínimo 8 caracteres.';
  }
  return null;
}
