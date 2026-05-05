import { describe, it, expect } from 'vitest';
import { resolveImage } from '../../../../src/design/background/primitives/image.js';
import type { ImageLayerConfig } from '../../../../src/design/identity/types.js';

describe('resolveImage', () => {
  it('returns LayerSpec with url and all defaults', () => {
    const config: ImageLayerConfig = {
      type: 'image',
      url: 'https://example.com/pattern.png',
    };
    const spec = resolveImage(config, 0);
    if (spec.kind !== 'image') throw new Error('expected image');
    expect(spec.url).toBe('https://example.com/pattern.png');
    expect(spec.size).toBe('cover');
    expect(spec.position).toBe('center');
    expect(spec.repeat).toBe('no-repeat');
  });

  it('respects explicit size, position, repeat', () => {
    const config: ImageLayerConfig = {
      type: 'image',
      url: 'x.png',
      size: '100px',
      position: 'top left',
      repeat: 'repeat',
    };
    const spec = resolveImage(config, 1);
    if (spec.kind !== 'image') throw new Error('expected image');
    expect(spec.size).toBe('100px');
    expect(spec.position).toBe('top left');
    expect(spec.repeat).toBe('repeat');
  });
});
