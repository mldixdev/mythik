/**
 * URL whitelist — restricts fetch actions to allowed domains.
 *
 * Usage:
 *   const guard = createUrlGuard(['miproyecto.supabase.co', 'mi-api.com']);
 *   guard.isAllowed('https://miproyecto.supabase.co/rest/v1/patients') → true
 *   guard.isAllowed('https://evil.com/steal') → false
 */

export interface UrlGuard {
  isAllowed: (url: string) => boolean;
  assertAllowed: (url: string) => void;
}

export function createUrlGuard(allowedDomains?: string[]): UrlGuard {
  function isAllowed(url: string): boolean {
    // No whitelist configured → allow all (developer's responsibility)
    if (!allowedDomains || allowedDomains.length === 0) return true;

    // Relative URLs are always allowed (same origin)
    if (!url.startsWith('http://') && !url.startsWith('https://')) return true;

    try {
      const parsed = new URL(url);
      return allowedDomains.some((domain) => {
        // Exact match or subdomain match
        return parsed.hostname === domain || parsed.hostname.endsWith('.' + domain);
      });
    } catch {
      // Invalid URL → block
      return false;
    }
  }

  function assertAllowed(url: string): void {
    if (!isAllowed(url)) {
      throw new Error(
        `Fetch blocked: "${url}" is not in the allowed domains list. ` +
        `Allowed: ${allowedDomains?.join(', ') ?? 'none configured'}`
      );
    }
  }

  return { isAllowed, assertAllowed };
}
