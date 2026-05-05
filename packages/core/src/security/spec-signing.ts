/**
 * Spec signing — detects tampered specs using HMAC.
 *
 * In development: disabled (no friction).
 * In production: each spec has a signature that must match.
 *
 * Usage:
 *   const signer = createSpecSigner({ enabled: true, secret: 'my-secret' });
 *   const signature = signer.sign(spec);
 *   signer.verify(spec, signature) → true
 *   signer.verify(tamperedSpec, signature) → false
 */

export interface SpecSignerConfig {
  enabled: boolean;
  secret?: string;
}

export interface SpecSigner {
  sign: (spec: unknown) => Promise<string>;
  verify: (spec: unknown, signature: string) => Promise<boolean>;
  isEnabled: () => boolean;
}

export function createSpecSigner(config: SpecSignerConfig): SpecSigner {
  function isEnabled(): boolean {
    return config.enabled && !!config.secret;
  }

  async function computeHash(data: string, secret: string): Promise<string> {
    // Use Web Crypto API (works in browser and Node 18+)
    if (typeof globalThis.crypto?.subtle !== 'undefined') {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const msgData = encoder.encode(data);

      const key = await crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
      );

      const signature = await crypto.subtle.sign('HMAC', key, msgData);
      return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }

    // Fallback: FNV-1a hash with secret prefix (not cryptographically secure, but deterministic)
    const str = secret + '::' + data;
    let h1 = 0x811c9dc5 >>> 0;
    let h2 = 0x01000193 >>> 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
    }
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  }

  function stableStringify(obj: unknown): string {
    if (obj === null || obj === undefined || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
    const sorted = Object.keys(obj as Record<string, unknown>).sort();
    return '{' + sorted.map((k) => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k])).join(',') + '}';
  }

  async function sign(spec: unknown): Promise<string> {
    if (!isEnabled()) return '';
    const json = stableStringify(spec);
    return computeHash(json, config.secret!);
  }

  async function verify(spec: unknown, signature: string): Promise<boolean> {
    if (!isEnabled()) return true;
    const expected = await sign(spec);
    return expected === signature;
  }

  return { sign, verify, isEnabled };
}
