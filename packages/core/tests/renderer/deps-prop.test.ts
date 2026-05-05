import { describe, it, expect } from 'vitest';
import { scanDeps } from '../../src/renderer/deps.js';

describe('scanDeps — $prop tracking', () => {
  it('returns a sentinel path /__prop/<name> for direct $prop references', () => {
    const deps = scanDeps({ content: { $prop: 'label' } });
    expect(deps.has('/__prop/label')).toBe(true);
  });

  it('tracks $prop deeply nested inside style', () => {
    const deps = scanDeps({
      style: { padding: { $prop: 'pad' }, color: { $token: 'primary' } },
      content: 'static',
    });
    expect(deps.has('/__prop/pad')).toBe(true);
    // Existing $token behavior preserved:
    expect(deps.has('/preferences/theme')).toBe(true);
  });

  it('tracks multiple distinct $prop references', () => {
    const deps = scanDeps({
      a: { $prop: 'x' },
      b: { $prop: 'y' },
      c: { nested: { $prop: 'z' } },
    });
    expect(deps.has('/__prop/x')).toBe(true);
    expect(deps.has('/__prop/y')).toBe(true);
    expect(deps.has('/__prop/z')).toBe(true);
  });

  it('ignores $prop with a non-string value (defensive)', () => {
    const deps = scanDeps({ a: { $prop: 42 } });
    expect([...deps].filter((p) => p.startsWith('/__prop/'))).toHaveLength(0);
  });
});
