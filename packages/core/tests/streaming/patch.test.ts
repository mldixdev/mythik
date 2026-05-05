import { describe, it, expect } from 'vitest';
import { applyPatch, applyPatches } from '../../src/streaming/patch.js';

describe('JSON Patch (RFC 6902)', () => {
  describe('add', () => {
    it('adds a value at root level', () => {
      const result = applyPatch({}, { op: 'add', path: '/root', value: 'main' });
      expect(result.root).toBe('main');
    });

    it('adds a nested value', () => {
      const result = applyPatch({ elements: {} }, {
        op: 'add',
        path: '/elements/card-1',
        value: { type: 'box', props: {} },
      });
      expect((result.elements as Record<string, unknown>)['card-1']).toEqual({ type: 'box', props: {} });
    });

    it('adds to array with -', () => {
      const result = applyPatch({ items: ['a', 'b'] }, { op: 'add', path: '/items/-', value: 'c' });
      expect(result.items).toEqual(['a', 'b', 'c']);
    });

    it('inserts into array at numeric index (RFC 6902 — insert before, not replace)', () => {
      const result = applyPatch({ items: ['a', 'b', 'c', 'd', 'e'] }, { op: 'add', path: '/items/2', value: 'X' });
      expect(result.items).toEqual(['a', 'b', 'X', 'c', 'd', 'e']);
    });

    it('inserts at beginning of array with index 0', () => {
      const result = applyPatch({ items: ['a', 'b', 'c'] }, { op: 'add', path: '/items/0', value: 'X' });
      expect(result.items).toEqual(['X', 'a', 'b', 'c']);
    });

    it('inserts at end of array with index equal to length', () => {
      const result = applyPatch({ items: ['a', 'b'] }, { op: 'add', path: '/items/2', value: 'X' });
      expect(result.items).toEqual(['a', 'b', 'X']);
    });
  });

  describe('remove', () => {
    it('removes a value', () => {
      const result = applyPatch({ a: 1, b: 2 }, { op: 'remove', path: '/a' });
      expect(result.a).toBeUndefined();
      expect(result.b).toBe(2);
    });

    it('removes from array', () => {
      const result = applyPatch({ items: ['a', 'b', 'c'] }, { op: 'remove', path: '/items/1' });
      expect(result.items).toEqual(['a', 'c']);
    });
  });

  describe('replace', () => {
    it('replaces a value', () => {
      const result = applyPatch({ name: 'old' }, { op: 'replace', path: '/name', value: 'new' });
      expect(result.name).toBe('new');
    });
  });

  describe('move', () => {
    it('moves a value', () => {
      const result = applyPatch({ a: 1, b: 2 }, { op: 'move', from: '/a', path: '/c' });
      expect(result.a).toBeUndefined();
      expect(result.c).toBe(1);
    });

    it('throws without from', () => {
      expect(() => applyPatch({}, { op: 'move', path: '/x' })).toThrow('from');
    });
  });

  describe('copy', () => {
    it('copies a value', () => {
      const result = applyPatch({ a: { x: 1 } }, { op: 'copy', from: '/a', path: '/b' });
      expect(result.b).toEqual({ x: 1 });
      // Should be a deep copy
      expect(result.a).not.toBe(result.b);
    });
  });

  describe('test', () => {
    it('passes when values match', () => {
      expect(() => applyPatch({ x: 42 }, { op: 'test', path: '/x', value: 42 })).not.toThrow();
    });

    it('throws when values differ', () => {
      expect(() => applyPatch({ x: 42 }, { op: 'test', path: '/x', value: 99 })).toThrow('test failed');
    });
  });

    it('inserts into single-element array at index 0', () => {
      const result = applyPatch({ children: ['existing'] }, { op: 'add', path: '/children/0', value: 'new' });
      expect(result.children).toEqual(['new', 'existing']);
      expect(result.children).toHaveLength(2);
    });

    it('inserts into nested single-element array after JSON roundtrip', () => {
      // Simulates JSONB: parse → structuredClone → patch
      const raw = JSON.parse(JSON.stringify({ elements: { modal: { children: ['form'] } } }));
      const cloned = structuredClone(raw);
      const result = applyPatch(cloned, { op: 'add', path: '/elements/modal/children/0', value: 'close-btn' });
      const modalChildren = (result.elements as any).modal.children;
      expect(modalChildren).toEqual(['close-btn', 'form']);
      expect(modalChildren).toHaveLength(2);
    });

    it('inserts into nested array inside a spec (SpecEngine scenario)', () => {
      const spec = {
        elements: {
          form: { type: 'stack', children: ['a', 'b', 'c'] },
        },
      };
      const result = applyPatches(spec, [
        { op: 'add', path: '/elements/new-el', value: { type: 'text', props: {} } },
        { op: 'add', path: '/elements/form/children/0', value: 'new-el' },
      ]);
      const form = (result.elements as any).form;
      expect(form.children).toEqual(['new-el', 'a', 'b', 'c']);
      expect(form.children).toHaveLength(4);
    });

  describe('applyPatches (batch)', () => {
    it('builds a spec incrementally', () => {
      const spec = applyPatches({}, [
        { op: 'add', path: '/root', value: 'main' },
        { op: 'add', path: '/elements', value: {} },
        { op: 'add', path: '/elements/main', value: { type: 'stack', children: [] } },
        { op: 'add', path: '/elements/title', value: { type: 'text', props: { content: 'Hello' } } },
        { op: 'add', path: '/elements/main/children/-', value: 'title' },
      ]);

      expect(spec.root).toBe('main');
      const elements = spec.elements as Record<string, Record<string, unknown>>;
      expect(elements.main.type).toBe('stack');
      expect(elements.main.children).toEqual(['title']);
      expect((elements.title.props as Record<string, unknown>).content).toBe('Hello');
    });
  });
});
