import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../src/security/index.js';

describe('file-upload validation', () => {
  it('validates uploadFile action requires bucket and target', () => {
    const spec = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['upload'] },
        upload: {
          type: 'file-upload',
          props: {},
          on: { upload: { action: 'uploadFile', params: {} } },
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('bucket'))).toBe(true);
    expect(result.errors.some((e) => e.message.includes('target'))).toBe(true);
  });

  it('passes valid file-upload with uploadFile action', () => {
    const spec = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['upload'] },
        upload: {
          type: 'file-upload',
          props: { accept: 'image/*' },
          on: { upload: { action: 'uploadFile', params: { bucket: 'avatars', target: '/form/avatar' } } },
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(true);
  });

  it('validates maxSize must be positive number', () => {
    const spec = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['upload'] },
        upload: {
          type: 'file-upload',
          props: { maxSize: -100 },
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('maxSize'))).toBe(true);
  });

  it('validates maxFiles must be positive integer', () => {
    const spec = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['upload'] },
        upload: {
          type: 'file-upload',
          props: { maxFiles: 0 },
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('maxFiles'))).toBe(true);
  });

  it('validates deleteFile action requires path and bucket', () => {
    const spec = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['btn'] },
        btn: {
          type: 'button',
          props: { label: 'Delete' },
          on: { press: { action: 'deleteFile', params: {} } },
        },
      },
    };
    const result = validateSpec(spec);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('path'))).toBe(true);
    expect(result.errors.some((e) => e.message.includes('bucket'))).toBe(true);
  });
});
