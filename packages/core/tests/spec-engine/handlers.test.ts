import { describe, it, expect } from 'vitest';
import { getDocumentHandler } from '../../src/spec-engine/handlers/index.js';

const screenDoc = {
  root: 'page',
  elements: { page: { type: 'box', props: {} } },
};

const appDoc = {
  type: 'app',
  name: 'Test App',
  navigation: { type: 'sidebar', initialScreen: 'home', screens: {} },
  screens: { home: { label: 'Home' } },
  layout: { root: 'main', elements: { main: { type: 'box', props: {} } } },
};

describe('getDocumentHandler', () => {
  it('detects screen spec by root + elements', () => {
    const handler = getDocumentHandler(screenDoc);
    expect(handler.type).toBe('screen');
  });

  it('detects app spec by type: "app"', () => {
    const handler = getDocumentHandler(appDoc);
    expect(handler.type).toBe('app');
  });

  it('throws on document without root or type', () => {
    expect(() => getDocumentHandler({ foo: 'bar' })).toThrow('Unknown document type');
  });

  it('throws on null', () => {
    expect(() => getDocumentHandler(null)).toThrow('Unknown document type');
  });

  it('throws on document with unknown type', () => {
    expect(() => getDocumentHandler({ type: 'widget' })).toThrow('Unknown document type');
  });
});
