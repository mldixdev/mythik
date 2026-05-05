import type { LayerBackground } from '../identity/types.js';

export const BACKGROUND_RECIPES: Record<string, LayerBackground> = {
  // Linear — dark bg + purple radial aura top-left + subtle grain
  'linear-aura': {
    color: '#0a0a0a',
    layers: [
      {
        type: 'gradient',
        kind: 'radial',
        shape: 'circle',
        size: '600px',
        position: '15% 20%',
        stops: [
          { color: '#8b5cf6', opacity: 0.35, at: '0%' },
          { color: 'transparent', at: '100%' },
        ],
      },
      { type: 'grain', intensity: 0.04, scale: 0.9, monochrome: true },
    ],
  },

  // Stripe — dark bg + multi-color flowing monthh
  'stripe-ribbons': {
    color: '#0a0014',
    layers: [
      {
        type: 'gradient',
        kind: 'radial',
        shape: 'circle',
        size: '500px',
        position: '0% 10%',
        stops: [
          { color: '#635bff', opacity: 0.3, at: '0%' },
          { color: 'transparent', at: '100%' },
        ],
      },
      {
        type: 'gradient',
        kind: 'radial',
        shape: 'circle',
        size: '450px',
        position: '85% 30%',
        stops: [
          { color: '#ff4081', opacity: 0.25, at: '0%' },
          { color: 'transparent', at: '100%' },
        ],
      },
      {
        type: 'gradient',
        kind: 'radial',
        shape: 'circle',
        size: '550px',
        position: '50% 100%',
        stops: [
          { color: '#00d4ff', opacity: 0.2, at: '0%' },
          { color: 'transparent', at: '100%' },
        ],
      },
    ],
  },

  // Vercel — dark bg + small center radial + grain
  'vercel-center': {
    color: '#000000',
    layers: [
      {
        type: 'gradient',
        kind: 'radial',
        shape: 'circle',
        size: '400px',
        position: 'center',
        stops: [
          { color: '#ffffff', opacity: 0.05, at: '0%' },
          { color: 'transparent', at: '100%' },
        ],
      },
      { type: 'grain', intensity: 0.05, scale: 1.0, monochrome: true },
    ],
  },

  // Arc — light + dual auras + grain
  'arc-organic': {
    color: '#fafafa',
    layers: [
      {
        type: 'gradient',
        kind: 'radial',
        shape: 'circle',
        size: '500px',
        position: '20% 30%',
        stops: [
          { color: '#ff5252', opacity: 0.2, at: '0%' },
          { color: 'transparent', at: '100%' },
        ],
      },
      {
        type: 'gradient',
        kind: 'radial',
        shape: 'circle',
        size: '500px',
        position: '80% 70%',
        stops: [
          { color: '#5252ff', opacity: 0.2, at: '0%' },
          { color: 'transparent', at: '100%' },
        ],
      },
      { type: 'grain', intensity: 0.05, scale: 0.85, monochrome: true },
    ],
  },

  // Dashboard — light + grid + dual auras
  'grid-subtle': {
    color: '#ffffff',
    layers: [
      { type: 'pattern', kind: 'grid', spacing: 48, thickness: 1, color: '#e5e7eb', opacity: 0.8 },
      {
        type: 'gradient',
        kind: 'radial',
        shape: 'circle',
        size: '500px',
        position: '0% 20%',
        stops: [
          { color: '#8b5cf6', opacity: 0.15, at: '0%' },
          { color: 'transparent', at: '100%' },
        ],
      },
      {
        type: 'gradient',
        kind: 'radial',
        shape: 'circle',
        size: '500px',
        position: '100% 0%',
        stops: [
          { color: '#3b82f6', opacity: 0.15, at: '0%' },
          { color: 'transparent', at: '100%' },
        ],
      },
    ],
  },

  // Notion — solid warm white (minimal)
  'notion-warm': {
    color: '#faf9f6',
  },

  // Raycast — solid near-black (minimal)
  'raycast-mono': {
    color: '#0a0a0a',
  },

  // Comic Book — light + crosshatch (halftone) + grain
  'comic-pop': {
    color: '#fff8dc',
    layers: [
      { type: 'pattern', kind: 'crosshatch', spacing: 8, thickness: 1, color: '#000000', angle: 45, opacity: 0.15 },
      { type: 'grain', intensity: 0.06, scale: 1.2, monochrome: true },
    ],
  },
};
