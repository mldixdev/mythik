import { describe, it, expect } from 'vitest';
import { surfaceToCSS, applyBorderElevationCSS } from '../../src/design/surface-to-css.js';
import { resolveSurfaceStyles } from '../../src/design/identity/index.js';
import type { BorderStyle, ElevationStyle } from '../../src/design/identity/index.js';

function makeSurface(surfaceType: 'elevated' | 'outlined' = 'elevated') {
  const colors = {
    primary: '#6366f1', surface: '#ffffff', background: '#f8fafc',
    border: '#d1d5db', text: '#0f172a',
  };
  const raw = resolveSurfaceStyles(surfaceType, colors);
  return surfaceToCSS(raw, 0.5, 0);
}

describe('applyBorderElevationCSS', () => {
  describe('border override', () => {
    it('overrides card and modal border', () => {
      const surface = makeSurface();
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 3, borderStyle: 'dashed' as BorderStyle,
        borderColor: '#ff0000',
        elevationStyle: 'diffuse' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.border).toBe('3px dashed #ff0000');
      expect(result.modal.border).toBe('3px dashed #ff0000');
    });

    it('does NOT override input, inputFocus, buttonPrimary, buttonSecondary', () => {
      const surface = makeSurface();
      const original = {
        input: { ...surface.input },
        inputFocus: { ...surface.inputFocus },
        buttonPrimary: { ...surface.buttonPrimary },
        buttonSecondary: { ...surface.buttonSecondary },
      };
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 3, borderStyle: 'dashed' as BorderStyle,
        borderColor: '#ff0000',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.input.border).toBe(original.input.border);
      expect(result.inputFocus.border).toBe(original.inputFocus.border);
      expect(result.buttonPrimary.border).toBe(original.buttonPrimary.border);
      expect(result.buttonSecondary.border).toBe(original.buttonSecondary.border);
    });

    it('borderWidth 0 produces no border', () => {
      const surface = makeSurface();
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 0, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.border).toBe('none');
    });

    it('borderStyle none produces no border', () => {
      const surface = makeSurface();
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 2, borderStyle: 'none' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.border).toBe('none');
    });
  });

  describe('elevation override', () => {
    it('elevationStyle none produces no shadow', () => {
      const surface = makeSurface();
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 1, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.boxShadow).toBe('none');
      expect(result.modal.boxShadow).toBe('none');
    });

    it('elevationStyle solid produces no-blur shadow', () => {
      const surface = makeSurface();
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 1, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'solid' as ElevationStyle, elevationColor: '#333333',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.boxShadow).toContain('0px 0px');
      expect(result.card.boxShadow).toContain('#333333');
      expect(result.card.boxShadow).not.toContain('rgba');
    });

    it('elevationStyle diffuse produces blur shadow with rgba', () => {
      const surface = makeSurface();
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 1, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'diffuse' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.boxShadow).toContain('rgba');
      expect(result.card.boxShadow).not.toBe('none');
    });

    it('elevationStyle color uses elevationColor as rgba', () => {
      const surface = makeSurface();
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 1, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'color' as ElevationStyle, elevationColor: '#0D9488',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.boxShadow).toContain('13,148,136');
    });

    it('depth 0 with non-none style produces none', () => {
      const surface = makeSurface();
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 1, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'diffuse' as ElevationStyle, elevationColor: '#000000',
        depth: 0, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.boxShadow).toBe('none');
    });

    it('shadowAngle 90 produces non-zero X offset', () => {
      const surface = makeSurface();
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 1, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'solid' as ElevationStyle, elevationColor: '#333333',
        depth: 0.5, shadowAngle: 90, slots: { cardModal: true, inputButtons: false },
      });
      // sin(90°) = 1, cos(90°) ≈ 0 → X offset is non-zero, Y offset is ~0
      expect(result.card.boxShadow).toMatch(/^[^0].*px 0px/);
    });

    it('does NOT override button/input shadows', () => {
      const surface = makeSurface();
      const originalBtnShadow = surface.buttonPrimary.boxShadow;
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 1, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.buttonPrimary.boxShadow).toBe(originalBtnShadow);
    });
  });

  describe('immutability', () => {
    it('returns new object, original unchanged', () => {
      const surface = makeSurface();
      const originalCardBorder = surface.card.border;
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 3, borderStyle: 'dashed' as BorderStyle,
        borderColor: '#ff0000',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(surface.card.border).toBe(originalCardBorder);
      expect(result.card.border).toBe('3px dashed #ff0000');
    });
  });

  describe('inputButtons slot', () => {
    it('overrides input and button borders when inputButtons enabled', () => {
      const surface = makeSurface();
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 3, borderStyle: 'dashed' as BorderStyle,
        borderColor: '#ff0000',
        elevationStyle: 'solid' as ElevationStyle, elevationColor: '#333',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: false, inputButtons: true },
      });
      expect(result.input.border).toBe('3px dashed #ff0000');
      expect(result.buttonPrimary.border).toBe('3px dashed #ff0000');
      expect(result.buttonSecondary.border).toBe('3px dashed #ff0000');
      // card NOT overridden
      expect(result.card.border).not.toBe('3px dashed #ff0000');
    });

    it('does NOT override inputFocus', () => {
      const surface = makeSurface();
      const originalFocus = surface.inputFocus.border;
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 3, borderStyle: 'dashed' as BorderStyle,
        borderColor: '#ff0000',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: false, inputButtons: true },
      });
      expect(result.inputFocus.border).toBe(originalFocus);
    });

    it('both slots enabled overrides everything except inputFocus', () => {
      const surface = makeSurface();
      const result = applyBorderElevationCSS(surface, {
        borderWidth: 2, borderStyle: 'dotted' as BorderStyle,
        borderColor: '#00ff00',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: true },
      });
      expect(result.card.border).toBe('2px dotted #00ff00');
      expect(result.modal.border).toBe('2px dotted #00ff00');
      expect(result.input.border).toBe('2px dotted #00ff00');
      expect(result.buttonPrimary.border).toBe('2px dotted #00ff00');
      expect(result.buttonSecondary.border).toBe('2px dotted #00ff00');
    });
  });
});

// --- RN Override Tests ---
import { surfaceToRN, applyBorderElevationRN } from '../../src/design/surface-to-rn.js';

function makeSurfaceRN(surfaceType: 'elevated' | 'outlined' = 'elevated') {
  const colors = {
    primary: '#6366f1', surface: '#ffffff', background: '#f8fafc',
    border: '#d1d5db', text: '#0f172a',
  };
  const raw = resolveSurfaceStyles(surfaceType, colors);
  return surfaceToRN(raw, 0.5, 0);
}

describe('applyBorderElevationRN', () => {
  describe('border override', () => {
    it('overrides card and modal border props', () => {
      const surface = makeSurfaceRN();
      const result = applyBorderElevationRN(surface, {
        borderWidth: 3, borderStyle: 'dashed' as BorderStyle,
        borderColor: '#ff0000',
        elevationStyle: 'diffuse' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.borderWidth).toBe(3);
      expect(result.card.borderStyle).toBe('dashed');
      expect(result.card.borderColor).toBe('#ff0000');
      expect(result.modal.borderWidth).toBe(3);
      expect(result.modal.borderColor).toBe('#ff0000');
    });

    it('does NOT override input or button border props', () => {
      const surface = makeSurfaceRN();
      const origInputBW = surface.input.borderWidth;
      const result = applyBorderElevationRN(surface, {
        borderWidth: 3, borderStyle: 'dashed' as BorderStyle,
        borderColor: '#ff0000',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.input.borderWidth).toBe(origInputBW);
    });

    it('borderWidth 0 clears border', () => {
      const surface = makeSurfaceRN();
      const result = applyBorderElevationRN(surface, {
        borderWidth: 0, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.borderWidth).toBe(0);
    });

    it('maps double borderStyle to solid for RN', () => {
      const surface = makeSurfaceRN();
      const result = applyBorderElevationRN(surface, {
        borderWidth: 2, borderStyle: 'double' as BorderStyle,
        borderColor: '#000000',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.borderStyle).toBe('solid');
    });
  });

  describe('elevation override', () => {
    it('elevationStyle none clears shadow', () => {
      const surface = makeSurfaceRN();
      const result = applyBorderElevationRN(surface, {
        borderWidth: 1, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.shadowOpacity).toBe(0);
      expect(result.card.elevation).toBe(0);
    });

    it('elevationStyle solid produces shadow with no blur', () => {
      const surface = makeSurfaceRN();
      const result = applyBorderElevationRN(surface, {
        borderWidth: 1, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'solid' as ElevationStyle, elevationColor: '#333333',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.shadowRadius).toBe(0);
      expect(result.card.shadowOpacity).toBe(1);
      expect(result.card.shadowColor).toBe('#333333');
    });

    it('elevationStyle color uses elevationColor', () => {
      const surface = makeSurfaceRN();
      const result = applyBorderElevationRN(surface, {
        borderWidth: 1, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'color' as ElevationStyle, elevationColor: '#0D9488',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.shadowColor).toContain('13,148,136');
    });

    it('elevationStyle diffuse produces soft shadow', () => {
      const surface = makeSurfaceRN();
      const result = applyBorderElevationRN(surface, {
        borderWidth: 1, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'diffuse' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.shadowRadius).toBeGreaterThan(0);
      expect(result.card.shadowOpacity).toBeGreaterThan(0);
      expect(result.card.elevation).toBeGreaterThan(0);
    });

    it('depth 0 clears shadow', () => {
      const surface = makeSurfaceRN();
      const result = applyBorderElevationRN(surface, {
        borderWidth: 1, borderStyle: 'solid' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'diffuse' as ElevationStyle, elevationColor: '#000000',
        depth: 0, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.shadowOpacity).toBe(0);
      expect(result.card.elevation).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('borderStyle none clears border', () => {
      const surface = makeSurfaceRN();
      const result = applyBorderElevationRN(surface, {
        borderWidth: 2, borderStyle: 'none' as BorderStyle,
        borderColor: '#d1d5db',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(result.card.borderWidth).toBe(0);
    });

    it('returns new object, original unchanged', () => {
      const surface = makeSurfaceRN();
      const origBW = surface.card.borderWidth;
      const result = applyBorderElevationRN(surface, {
        borderWidth: 3, borderStyle: 'dashed' as BorderStyle,
        borderColor: '#ff0000',
        elevationStyle: 'none' as ElevationStyle, elevationColor: '#000000',
        depth: 0.5, shadowAngle: 0, slots: { cardModal: true, inputButtons: false },
      });
      expect(surface.card.borderWidth).toBe(origBW);
      expect(result.card.borderWidth).toBe(3);
    });
  });
});
