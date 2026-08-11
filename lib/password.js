import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

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
