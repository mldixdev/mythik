import bcrypt from 'bcryptjs';
import type { PasswordVerifier } from './types.js';

const bcryptVerifier: PasswordVerifier = {
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },
};

const verifiers: Record<string, PasswordVerifier> = {
  bcrypt: bcryptVerifier,
};

export function getPasswordVerifier(algorithm: string | undefined): PasswordVerifier {
  const name = algorithm ?? 'bcrypt';
  const verifier = verifiers[name];
  if (!verifier) {
    throw new Error(`Unsupported password hash algorithm: "${name}". Supported: ${Object.keys(verifiers).join(', ')}`);
  }
  return verifier;
}
