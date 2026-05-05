import React from 'react';
import type { CSSProperties } from 'react';
import type { LayerSpec } from 'mythik';

interface BackgroundLayerProps {
  spec: LayerSpec;
}

function commonStyle(spec: LayerSpec): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    opacity: spec.common.opacity,
    mixBlendMode: spec.common.blendMode === 'normal' ? undefined : spec.common.blendMode,
    zIndex: spec.common.zIndex,
    pointerEvents: 'none',
  };
}

function extractPatternId(svg: string): string {
  const match = svg.match(/<pattern\s+id="([^"]+)"/);
  return match ? match[1] : 'unknown';
}

export function BackgroundLayer({ spec }: BackgroundLayerProps) {
  switch (spec.kind) {
    case 'solid':
      return <div style={{ ...commonStyle(spec), backgroundColor: spec.color }} />;

    case 'gradient':
      return <div style={{ ...commonStyle(spec), backgroundImage: spec.css }} />;

    case 'image':
      return (
        <div
          style={{
            ...commonStyle(spec),
            backgroundImage: `url(${spec.url})`,
            backgroundSize: spec.size,
            backgroundPosition: spec.position,
            backgroundRepeat: spec.repeat,
          }}
        />
      );

    case 'pattern': {
      const id = extractPatternId(spec.svg);
      const innerHTML = `<defs>${spec.svg}</defs><rect width="100%" height="100%" fill="url(#${id})"/>`;
      return (
        <svg
          style={commonStyle(spec)}
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          dangerouslySetInnerHTML={{ __html: innerHTML }}
        />
      );
    }

    case 'grain':
      return (
        <svg
          style={commonStyle(spec)}
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          dangerouslySetInnerHTML={{ __html: spec.svg }}
        />
      );

    case 'blobs':
      // Plan 3 Task 16 stub — renders a placeholder div that carries common
      // style. Task 18 replaces this branch with <BlobLayer /> which resolves
      // palette + BLOB_CATALOG + motion → ambient animations and mounts an
      // <svg> root with per-blob <path>/<circle> + useShapeAnimations.
      return <div data-sv-layer="blobs" style={commonStyle(spec)} />;

    default: {
      const _exhaustive: never = spec;
      void _exhaustive;
      return null;
    }
  }
}
