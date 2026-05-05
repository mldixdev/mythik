import React from 'react';
import { View, Image } from 'react-native';
import type { ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { LayerSpec } from 'mythik';

interface BackgroundLayerProps {
  spec: LayerSpec;
}

function commonStyle(spec: LayerSpec): ViewStyle {
  return {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: spec.common.opacity,
    zIndex: spec.common.zIndex,
  };
}

function extractPatternId(svg: string): string {
  const match = svg.match(/<pattern\s+id="([^"]+)"/);
  return match ? match[1] : 'unknown';
}

export function BackgroundLayer({ spec }: BackgroundLayerProps) {
  switch (spec.kind) {
    case 'solid':
      return <View style={{ ...commonStyle(spec), backgroundColor: spec.color }} />;

    case 'gradient': {
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><defs>${spec.svg.def}</defs><rect width="100%" height="100%" fill="${spec.svg.fill}"/></svg>`;
      return <SvgXml xml={svgContent} style={commonStyle(spec)} width="100%" height="100%" />;
    }

    case 'image':
      return (
        <Image
          source={{ uri: spec.url }}
          style={commonStyle(spec)}
          resizeMode={spec.size === 'cover' ? 'cover' : spec.size === 'contain' ? 'contain' : 'stretch'}
        />
      );

    case 'pattern': {
      const id = extractPatternId(spec.svg);
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><defs>${spec.svg}</defs><rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
      return <SvgXml xml={svgContent} style={commonStyle(spec)} width="100%" height="100%" />;
    }

    case 'grain': {
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${spec.svg}</svg>`;
      return <SvgXml xml={svgContent} style={commonStyle(spec)} width="100%" height="100%" />;
    }

    case 'blobs':
      // Plan 3 Task 16 stub — RN parity with the web sibling
      // (packages/react/src/background/BackgroundLayer.tsx). Task 19 replaces
      // this branch with <BlobLayer /> which resolves palette + BLOB_CATALOG
      // and mounts <Svg><Path>/<Circle>/…</Svg> with useShapeAnimations (RN).
      return <View testID="sv-layer-blobs" style={commonStyle(spec)} />;

    default: {
      const _exhaustive: never = spec;
      void _exhaustive;
      return null;
    }
  }
}
