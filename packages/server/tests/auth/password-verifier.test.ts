import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { getPasswordVerifier } from '../../src/auth/password-verifier.js';

describe('PasswordVerifier', () => {
  describe('bcrypt', () => {
    it('verifies correct password', async () => {
      const hash = bcrypt.hashSync('secret123', 10);
      const verifier = getPasswordVerifier('bcrypt');
      expect(await verifier.verify('secret123', hash)).toBe(true);
    });

    it('rejects wrong password', async () => {
      const hash = bcrypt.hashSync('secret123', 10);
      const verifier = getPasswordVerifier('bcrypt');
      expect(await verifier.verify('wrongpass', hash)).toBe(false);
    });
  });

  describe('default', () => {
    it('defaults to bcrypt when no algorithm specified', async () => {
      const hash = bcrypt.hashSync('test', 10);
      const verifier = getPasswordVerifier(undefined);
      expect(await verifier.verify('test', hash)).toBe(true);
    });
  });

  describe('unknown algorithm', () => {
    it('throws for unsupported algorithm', () => {
      expect(() => getPasswordVerifier('md5' as 'bcrypt')).toThrow('Unsupported password hash algorithm');
    });
  });
});
