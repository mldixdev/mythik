// Constructable StyleSheets singleton with <style>.insertRule fallback.
// Closes the dangerouslySetInnerHTML gap for animation keyframes — both the
// Constructable path and the fallback path use CSSOM APIs (insertRule) so
// no string-into-HTML injection ever happens in this module.
//
// Dedup: keyframes registered by a stable `name` are inserted exactly once.
// Subsequent calls with the same name are no-ops.
//
// Mode selection:
//   - Constructable (Chrome/Edge/Firefox/Safari \u226516.4): feature-detected via
//     new CSSStyleSheet() + adoptedStyleSheets. Rules are attached to
//     document.adoptedStyleSheets so they apply to the whole document.
//   - Fallback (Safari < 16.4, or any browser lacking Constructable): a single
//     <style data-mythik-animations> tag is appended to document.head and
//     rules are inserted via sheet.insertRule. CSSOM, not innerHTML.
//
// SSR-safe: module-scope state is initialized lazily on first registerKeyframes
// call, and all DOM access is guarded by `typeof document !== 'undefined'`.

type SingletonState = {
  registered: Set<string>;
  sheet: CSSStyleSheet | null;
  fallbackEl: HTMLStyleElement | null;
  mode: 'constructable' | 'fallback' | 'uninitialized';
};

const state: SingletonState = {
  registered: new Set(),
  sheet: null,
  fallbackEl: null,
  mode: 'uninitialized',
};

function canUseDOM(): boolean {
  return typeof document !== 'undefined';
}

function supportsConstructable(): boolean {
  if (!canUseDOM()) return false;
  try {
    const probe = new CSSStyleSheet();
    probe.replaceSync('');
    // Accessing adoptedStyleSheets throws on older Safari even with the
    // CSSStyleSheet constructor present. jsdom exposes the property but
    // returns a non-iterable value — verify iterability to be safe.
    const sheets = document.adoptedStyleSheets as unknown;
    if (!sheets) return false;
    if (!Array.isArray(sheets) && typeof (sheets as { [Symbol.iterator]?: unknown })[Symbol.iterator] !== 'function') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function initialize(): void {
  if (state.mode !== 'uninitialized') return;
  if (!canUseDOM()) {
    state.mode = 'fallback';
    return;
  }

  if (supportsConstructable()) {
    const sheet = new CSSStyleSheet();
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    state.sheet = sheet;
    state.mode = 'constructable';
    return;
  }

  const el = document.createElement('style');
  el.setAttribute('data-mythik-animations', '');
  document.head.appendChild(el);
  state.fallbackEl = el;
  state.mode = 'fallback';
}

export function registerKeyframes(name: string, keyframesText: string): void {
  if (state.registered.has(name)) return;
  initialize();
  if (!canUseDOM()) return;

  if (state.mode === 'constructable' && state.sheet) {
    state.sheet.insertRule(keyframesText, state.sheet.cssRules.length);
  } else if (state.mode === 'fallback' && state.fallbackEl) {
    const sheet = state.fallbackEl.sheet;
    if (sheet) {
      sheet.insertRule(keyframesText, sheet.cssRules.length);
    }
  }
  state.registered.add(name);
}

/**
 * Test-only reset. Do NOT call from production code.
 * Needed so unit tests can start from a clean singleton between cases.
 *
 * Note: removes the old sheet from `document.adoptedStyleSheets` and
 * nulls the module-state reference. Any external code holding a
 * reference to the old sheet (e.g. devtools inspection, debug overlays)
 * would dangle — currently no such consumer exists in the framework.
 */
export function __resetSingletonForTests(): void {
  state.registered.clear();
  if (state.sheet && canUseDOM()) {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== state.sheet);
  }
  if (state.fallbackEl && state.fallbackEl.parentNode) {
    state.fallbackEl.parentNode.removeChild(state.fallbackEl);
  }
  state.sheet = null;
  state.fallbackEl = null;
  state.mode = 'uninitialized';
}
