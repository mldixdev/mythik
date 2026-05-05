import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerKeyframes,
  __resetSingletonForTests,
} from '../../src/animation/stylesheet-singleton.js';

function findRuleByName(name: string): boolean {
  const adopted = (document as unknown as { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets;
  if (adopted) {
    for (const s of adopted) {
      for (const r of Array.from(s.cssRules)) {
        if ((r as CSSKeyframesRule).name === name) return true;
      }
    }
  }
  const styleTags = document.head.querySelectorAll('style[data-mythik-animations]');
  for (const t of styleTags) {
    const sheet = (t as HTMLStyleElement).sheet;
    if (!sheet) continue;
    for (const r of Array.from(sheet.cssRules)) {
      if ((r as CSSKeyframesRule).name === name) return true;
    }
  }
  return false;
}

function countRulesWithName(name: string): number {
  let total = 0;
  const adopted = (document as unknown as { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets;
  if (adopted) {
    for (const s of adopted) {
      for (const r of Array.from(s.cssRules)) {
        if ((r as CSSKeyframesRule).name === name) total++;
      }
    }
  }
  const styleTags = document.head.querySelectorAll('style[data-mythik-animations]');
  for (const t of styleTags) {
    const sheet = (t as HTMLStyleElement).sheet;
    if (!sheet) continue;
    for (const r of Array.from(sheet.cssRules)) {
      if ((r as CSSKeyframesRule).name === name) total++;
    }
  }
  return total;
}

describe('animation stylesheet singleton', () => {
  beforeEach(() => {
    __resetSingletonForTests();
  });

  it('inserts keyframes on first registration', () => {
    const name = 'svka-test1';
    const text = `@keyframes ${name} { 0% { opacity: 0 } 100% { opacity: 1 } }`;
    registerKeyframes(name, text);
    expect(findRuleByName(name)).toBe(true);
  });

  it('second registration with same name is a no-op (dedup)', () => {
    const name = 'svka-dup';
    const text = `@keyframes ${name} { 0% { opacity: 0 } 100% { opacity: 1 } }`;
    registerKeyframes(name, text);
    registerKeyframes(name, text);
    expect(countRulesWithName(name)).toBe(1);
  });

  it('different names produce different rules', () => {
    registerKeyframes('svka-a', '@keyframes svka-a { 0% { opacity: 0 } 100% { opacity: 1 } }');
    registerKeyframes('svka-b', '@keyframes svka-b { 0% { opacity: 1 } 100% { opacity: 0 } }');
    expect(findRuleByName('svka-a')).toBe(true);
    expect(findRuleByName('svka-b')).toBe(true);
  });

  it('fallback path: when adoptedStyleSheets access throws, creates a <style> tag', () => {
    // Simulate Safari < 16.4 behavior where adoptedStyleSheets throws
    const originalAdopted = Object.getOwnPropertyDescriptor(Document.prototype, 'adoptedStyleSheets');
    Object.defineProperty(document, 'adoptedStyleSheets', {
      get() { throw new Error('unsupported'); },
      configurable: true,
    });
    __resetSingletonForTests();
    try {
      registerKeyframes(
        'svka-fallback',
        '@keyframes svka-fallback { 0% { opacity: 0 } 100% { opacity: 1 } }',
      );
      const tag = document.head.querySelector('style[data-mythik-animations]');
      expect(tag).not.toBeNull();
    } finally {
      if (originalAdopted) {
        Object.defineProperty(Document.prototype, 'adoptedStyleSheets', originalAdopted);
      } else {
        delete (document as Record<string, unknown>).adoptedStyleSheets;
      }
    }
  });

  it('module exports exist (SSR-import-safe smoke)', () => {
    expect(typeof registerKeyframes).toBe('function');
    expect(typeof __resetSingletonForTests).toBe('function');
  });

  it('registering keyframes across many calls preserves dedup cache', () => {
    for (let i = 0; i < 10; i++) {
      registerKeyframes('svka-burst', '@keyframes svka-burst { 0% { opacity: 0 } 100% { opacity: 1 } }');
    }
    expect(countRulesWithName('svka-burst')).toBe(1);
  });
});
