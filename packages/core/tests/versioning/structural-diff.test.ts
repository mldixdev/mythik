import { describe, it, expect } from 'vitest';
import { computeStructuralDiff } from '../../src/versioning/structural-diff.js';

describe('computeStructuralDiff', () => {
  describe('screen specs', () => {
    it('detects added element', () => {
      const before = { elements: { page: { type: 'box' } } };
      const after = { elements: { page: { type: 'box' }, btn: { type: 'touchable' } } };
      const diff = computeStructuralDiff(before, after, 1, 2);

      expect(diff.changes).toHaveLength(1);
      expect(diff.changes[0].kind).toBe('element-added');
      expect(diff.changes[0].elementId).toBe('btn');
      expect(diff.changes[0].detail).toContain('touchable');
      expect(diff.summary).toContain('+1');
    });

    it('detects removed element', () => {
      const before = { elements: { page: { type: 'box' }, btn: { type: 'touchable' } } };
      const after = { elements: { page: { type: 'box' } } };
      const diff = computeStructuralDiff(before, after, 1, 2);

      expect(diff.changes).toHaveLength(1);
      expect(diff.changes[0].kind).toBe('element-removed');
      expect(diff.changes[0].elementId).toBe('btn');
    });

    it('detects prop change', () => {
      const before = { elements: { btn: { type: 'touchable', props: { label: 'Send' } } } };
      const after = { elements: { btn: { type: 'touchable', props: { label: 'Submit' } } } };
      const diff = computeStructuralDiff(before, after, 1, 2);

      expect(diff.changes).toHaveLength(1);
      expect(diff.changes[0].kind).toBe('prop-changed');
      expect(diff.changes[0].elementId).toBe('btn');
      expect(diff.changes[0].detail).toContain('label');
    });

    it('detects action change', () => {
      const before = { elements: { btn: { type: 'touchable', on: { press: { action: 'fetch' } } } } };
      const after = { elements: { btn: { type: 'touchable', on: { press: { action: 'submitForm' } } } } };
      const diff = computeStructuralDiff(before, after, 1, 2);

      expect(diff.changes).toHaveLength(1);
      expect(diff.changes[0].kind).toBe('action-changed');
      expect(diff.changes[0].elementId).toBe('btn');
    });

    it('detects section change (dataSources)', () => {
      const before = { elements: {}, dataSources: { items: { url: '/api/items' } } };
      const after = { elements: {}, dataSources: { items: { url: '/api/items-v2' } } };
      const diff = computeStructuralDiff(before, after, 1, 2);

      expect(diff.changes.some(c => c.kind === 'section-changed' && c.path === 'dataSources')).toBe(true);
    });

    it('returns empty changes for identical specs', () => {
      const spec = { elements: { page: { type: 'box' } } };
      const diff = computeStructuralDiff(spec, spec, 1, 1);
      expect(diff.changes).toHaveLength(0);
      expect(diff.summary).toBe('No changes');
    });

    it('generates correct summary', () => {
      const before = { elements: { a: { type: 'box' }, b: { type: 'text' } } };
      const after = { elements: { a: { type: 'box', props: { x: 1 } }, c: { type: 'input' } } };
      const diff = computeStructuralDiff(before, after, 1, 2);

      expect(diff.summary).toContain('+1');
      expect(diff.summary).toContain('-1');
    });
  });

  describe('api specs', () => {
    it('detects added endpoint with method and path', () => {
      const before = { type: 'api', endpoints: {} };
      const after = { type: 'api', endpoints: { getUsers: { path: '/api/users', method: 'GET' } } };
      const diff = computeStructuralDiff(before, after, 1, 2);

      expect(diff.changes).toHaveLength(1);
      expect(diff.changes[0].path).toBe('endpoints/getUsers');
      expect(diff.changes[0].detail).toContain('getUsers');
      expect(diff.changes[0].detail).toContain('GET /api/users');
    });

    it('detects removed endpoint', () => {
      const before = { type: 'api', endpoints: { getUsers: { path: '/api/users', method: 'GET' } } };
      const after = { type: 'api', endpoints: {} };
      const diff = computeStructuralDiff(before, after, 1, 2);

      expect(diff.changes).toHaveLength(1);
      expect(diff.changes[0].detail).toContain('removed');
    });

    it('detects catalog change at item level', () => {
      const before = { type: 'api', catalogs: { roles: { from: 'Roles' } } };
      const after = { type: 'api', catalogs: { roles: { from: 'UserRoles' } } };
      const diff = computeStructuralDiff(before, after, 1, 2);

      expect(diff.changes.some(c => c.path.startsWith('catalogs/roles'))).toBe(true);
      expect(diff.changes[0].detail).toContain('roles');
    });
  });

  describe('app specs', () => {
    it('detects navigation change', () => {
      const before = { type: 'app', navigation: { menu: ['dashboard'] }, screens: {} };
      const after = { type: 'app', navigation: { menu: ['dashboard', 'settings'] }, screens: {} };
      const diff = computeStructuralDiff(before, after, 1, 2);

      expect(diff.changes.some(c => c.path === 'navigation')).toBe(true);
    });

    it('detects token change', () => {
      const before = { type: 'app', tokens: { primary: '#007bff' }, screens: {} };
      const after = { type: 'app', tokens: { primary: '#0d6efd' }, screens: {} };
      const diff = computeStructuralDiff(before, after, 1, 2);

      expect(diff.changes.some(c => c.path === 'tokens')).toBe(true);
    });
  });
});
