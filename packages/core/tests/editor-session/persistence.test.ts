import { describe, expect, it } from 'vitest';
import {
  applySaveTargetToCapturedSnapshot,
  buildEditorSessionSaveBody,
  mergeEditorSessionPersistence,
  normalizeEditorSaveError,
} from '../../src/editor-session/persistence.js';

describe('editor session persistence helpers', () => {
  it('builds nested trackedPaths payloads from captured snapshots', () => {
    const body = buildEditorSessionSaveBody('trackedPaths', {
      '/layout/items': [{ id: 'item-1' }],
      '/layout/zones': [{ id: 'zone-1' }],
    });

    expect(body).toEqual({
      layout: {
        items: [{ id: 'item-1' }],
        zones: [{ id: 'zone-1' }],
      },
    });
  });

  it('does not deep-sanitize editor document values', () => {
    const body = buildEditorSessionSaveBody('trackedPaths', {
      '/layout/items': [{ id: 'item-1', label: '' }],
    });

    expect(body).toEqual({
      layout: {
        items: [{ id: 'item-1', label: '' }],
      },
    });
  });

  it('builds snapshot payloads keyed by absolute paths', () => {
    const body = buildEditorSessionSaveBody('snapshot', {
      '/layout/items': [{ id: 'item-1' }],
    });

    expect(body).toEqual({
      paths: {
        '/layout/items': [{ id: 'item-1' }],
      },
    });
  });

  it('preserves custom object bodies exactly for save-time expression resolution', () => {
    const customBody = { items: { $state: '/layout/items' }, meta: { source: 'editor' } };

    expect(buildEditorSessionSaveBody(customBody, {})).toEqual(customBody);
  });

  it('merges call overrides over session persistence defaults and deep-merges headers', () => {
    expect(mergeEditorSessionPersistence(
      { url: '/api/layout', method: 'PUT', body: 'trackedPaths', headers: { 'x-tenant': 'a' } },
      { method: 'PATCH', target: '/save/result', headers: { 'x-request-id': 'b' } },
    )).toEqual({
      url: '/api/layout',
      method: 'PATCH',
      body: 'trackedPaths',
      headers: { 'x-tenant': 'a', 'x-request-id': 'b' },
      target: '/save/result',
    });
  });

  it('keeps expression url overrides for runtime resolution', () => {
    expect(mergeEditorSessionPersistence(
      { url: '/api/layout' },
      { url: { $state: '/ui/saveUrl' } },
    ).url).toEqual({ $state: '/ui/saveUrl' });
  });

  it('applies save targets inside tracked snapshots without replacing later live state', () => {
    const snapshot = {
      '/layout': { items: [{ id: 'item-1' }] },
    };

    expect(applySaveTargetToCapturedSnapshot(snapshot, '/layout/savedAt', 'now')).toEqual({
      '/layout': { items: [{ id: 'item-1' }], savedAt: 'now' },
    });
  });

  it('normalizes HTTP save error payloads', () => {
    expect(normalizeEditorSaveError({ status: 500, message: 'HTTP 500', data: { detail: 'no' } })).toEqual({
      status: 500,
      message: 'HTTP 500',
      data: { detail: 'no' },
    });
  });

  it('normalizes thrown errors', () => {
    expect(normalizeEditorSaveError(new Error('Connection refused'))).toEqual({
      message: 'Connection refused',
    });
  });
});
