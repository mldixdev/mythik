import type { PatternLayerConfig, LayerSpec } from '../../identity/types.js';
import { gridPatternSVG } from './grid.js';
import { dotsPatternSVG } from './dots.js';
import { diagonalPatternSVG } from './diagonal.js';
import { isoPatternSVG } from './iso.js';
import { crosshatchPatternSVG } from './crosshatch.js';
import { chevronPatternSVG } from './chevron.js';
import { sanitizeSVGShapes } from '../sanitizer.js';
import { resolveCommon } from '../primitives/solid.js';

const DEFAULT_SPACING = 20;
const DEFAULT_TILE = 20;

export function resolvePattern(config: PatternLayerConfig, index: number): LayerSpec {
  let svg: string;
  let tileSize: number;

  switch (config.kind) {
    case 'grid':
      svg = gridPatternSVG({ spacing: config.spacing ?? DEFAULT_SPACING, thickness: config.thickness, color: config.color });
      tileSize = config.spacing ?? DEFAULT_SPACING;
      break;
    case 'dots':
      svg = dotsPatternSVG({ spacing: config.spacing ?? DEFAULT_SPACING, dotRadius: config.dotRadius, color: config.color });
      tileSize = config.spacing ?? DEFAULT_SPACING;
      break;
    case 'diagonal':
      svg = diagonalPatternSVG({ spacing: config.spacing ?? DEFAULT_SPACING, thickness: config.thickness, color: config.color, angle: config.angle });
      tileSize = config.spacing ?? DEFAULT_SPACING;
      break;
    case 'iso':
      svg = isoPatternSVG({ spacing: config.spacing ?? DEFAULT_SPACING, thickness: config.thickness, color: config.color });
      tileSize = config.spacing ?? DEFAULT_SPACING;
      break;
    case 'crosshatch':
      svg = crosshatchPatternSVG({ spacing: config.spacing ?? DEFAULT_SPACING, thickness: config.thickness, color: config.color, angle: config.angle });
      tileSize = config.spacing ?? DEFAULT_SPACING;
      break;
    case 'chevron':
      svg = chevronPatternSVG({ spacing: config.spacing ?? DEFAULT_SPACING, thickness: config.thickness, color: config.color, angle: config.angle });
      tileSize = config.spacing ?? DEFAULT_SPACING;
      break;
    case 'custom-svg': {
      const sanitized = sanitizeSVGShapes(config.shapes ?? '');
      tileSize = config.tileSize ?? DEFAULT_TILE;
      const id = `custom-${index}-${tileSize}`;
      svg = `<pattern id="${id}" width="${tileSize}" height="${tileSize}" patternUnits="userSpaceOnUse">${sanitized}</pattern>`;
      break;
    }
    default:
      throw new Error(`Unknown pattern kind: ${(config as { kind: string }).kind}`);
  }

  return {
    kind: 'pattern',
    svg,
    tileSize,
    common: resolveCommon(config, index),
  };
}
