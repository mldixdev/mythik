import { describe, it, expect } from 'vitest';
import { RESERVED_PATHS, type ReservedPath } from '../../src/state/reserved-paths.js';

describe('RESERVED_PATHS', () => {
  it('exports SELECTED_ROW as /ui/selectedRow', () => {
    expect(RESERVED_PATHS.SELECTED_ROW).toBe('/ui/selectedRow');
  });

  it('exports LOADING as /ui/loading', () => {
    expect(RESERVED_PATHS.LOADING).toBe('/ui/loading');
  });

  it('exports RENDER_ERRORS as /ui/renderErrors', () => {
    expect(RESERVED_PATHS.RENDER_ERRORS).toBe('/ui/renderErrors');
  });

  it('exports SPATIAL_ITEM_CHANGE as /ui/spatialItemChange', () => {
    expect(RESERVED_PATHS.SPATIAL_ITEM_CHANGE).toBe('/ui/spatialItemChange');
  });

  it('exports EDITOR_SESSIONS as /ui/editorSessions', () => {
    expect(RESERVED_PATHS.EDITOR_SESSIONS).toBe('/ui/editorSessions');
  });

  it('exports CLIPBOARD as /ui/clipboard', () => {
    expect(RESERVED_PATHS.CLIPBOARD).toBe('/ui/clipboard');
  });

  it('exports RESOLVED_TOKENS as /tokens/resolved', () => {
    expect(RESERVED_PATHS.RESOLVED_TOKENS).toBe('/tokens/resolved');
  });

  it('all paths start with /', () => {
    for (const value of Object.values(RESERVED_PATHS)) {
      expect(value.startsWith('/')).toBe(true);
    }
  });

  it('ReservedPath type matches values (compile-time check)', () => {
    const path: ReservedPath = RESERVED_PATHS.SELECTED_ROW;
    expect(typeof path).toBe('string');
  });
});
