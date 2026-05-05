import { describe, it, expect } from 'vitest';
import { getElements } from '../../src/spec-engine/elements.js';
import type { Spec } from '../../src/types.js';

const spec: Spec = {
  root: 'page',
  elements: {
    page: { type: 'stack', props: {}, children: ['header', 'content'] },
    header: { type: 'text', props: { content: 'Title' } },
    content: {
      type: 'box',
      props: { style: { padding: 16 } },
      children: ['btn'],
      on: { press: { action: 'navigate', params: { screen: 'next' } } },
    },
    btn: { type: 'button', props: { label: 'Go' } },
  },
};

describe('getElements', () => {
  it('returns requested elements in found', () => {
    const result = getElements(spec, ['header', 'btn']);
    expect(Object.keys(result.found)).toEqual(['header', 'btn']);
    expect(result.found.header).toEqual(spec.elements.header);
    expect(result.found.btn).toEqual(spec.elements.btn);
    expect(result.notFound).toEqual([]);
  });

  it('reports missing elements in notFound', () => {
    const result = getElements(spec, ['header', 'nonexistent', 'also-missing']);
    expect(Object.keys(result.found)).toEqual(['header']);
    expect(result.notFound).toEqual(['nonexistent', 'also-missing']);
  });

  it('returns empty found and all notFound when none exist', () => {
    const result = getElements(spec, ['x', 'y']);
    expect(result.found).toEqual({});
    expect(result.notFound).toEqual(['x', 'y']);
  });

  it('handles empty request', () => {
    const result = getElements(spec, []);
    expect(result.found).toEqual({});
    expect(result.notFound).toEqual([]);
  });

  it('returns the full element definition including children, on, props', () => {
    const result = getElements(spec, ['content']);
    expect(result.found.content.children).toEqual(['btn']);
    expect(result.found.content.on).toBeDefined();
    expect(result.found.content.props).toEqual({ style: { padding: 16 } });
  });
});
