import type { ValidationError } from './spec-validator.js';
import {
  BORDER_COLOR_SOURCES,
  BORDER_STYLES,
  CARD_LINE_POSITIONS,
  COLOR_SCHEMES,
  COLOR_WEIGHTS,
  ELEVATION_COLORS,
  ELEVATION_STYLES,
  GRADIENT_MODES,
  HEADING_COLORS,
  ICON_CONTAINER_COLORS,
  ICON_CONTAINERS,
  ICON_WEIGHTS,
  IMAGE_CORNERS,
  IMAGE_OVERLAYS,
  LABEL_STYLES,
  RADIUS_PATTERNS,
  SURFACE_TYPES,
  TEXT_DECORATIONS,
  TYPOGRAPHY_HIERARCHIES,
} from '../design/identity/types.js';

const ENUM_FIELDS: Record<string, readonly string[]> = {
  surface: SURFACE_TYPES,
  radiusPattern: RADIUS_PATTERNS,
  borderStyle: BORDER_STYLES,
  borderColor: BORDER_COLOR_SOURCES,
  elevationStyle: ELEVATION_STYLES,
  elevationColor: ELEVATION_COLORS,
  typographyHierarchy: TYPOGRAPHY_HIERARCHIES,
  labelStyle: LABEL_STYLES,
  headingColor: HEADING_COLORS,
  colorScheme: COLOR_SCHEMES,
  colorWeight: COLOR_WEIGHTS,
};

function addEnumError(errors: ValidationError[], path: string, value: unknown, allowed: readonly string[]): void {
  errors.push({
    message: `${path} must be one of: ${allowed.join(', ')} (received ${JSON.stringify(value)})`,
    path,
  });
}

function isAllowed(value: string, allowed: readonly string[]): boolean {
  return allowed.includes(value);
}

function validateEnum(errors: ValidationError[], obj: Record<string, unknown>, key: string, basePath: string, allowed: readonly string[]): void {
  const value = obj[key];
  if (value !== undefined && (typeof value !== 'string' || !isAllowed(value, allowed))) {
    addEnumError(errors, `${basePath}/${key}`, value, allowed);
  }
}

function validateBoolean(errors: ValidationError[], obj: Record<string, unknown>, key: string, basePath: string): void {
  const value = obj[key];
  if (value !== undefined && typeof value !== 'boolean') {
    errors.push({ message: `${basePath}/${key} must be a boolean`, path: `${basePath}/${key}` });
  }
}

function validateNumberRange(errors: ValidationError[], obj: Record<string, unknown>, key: string, basePath: string, min: number, max: number): void {
  const value = obj[key];
  if (value !== undefined && (typeof value !== 'number' || value < min || value > max)) {
    errors.push({ message: `${basePath}/${key} must be a number from ${min} to ${max}`, path: `${basePath}/${key}` });
  }
}

function validateObject(value: unknown, path: string, errors: ValidationError[]): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push({ message: `${path} must be an object`, path });
    return undefined;
  }
  return value as Record<string, unknown>;
}

function validateStringArray(errors: ValidationError[], value: unknown, path: string, allowed: readonly string[]): void {
  if (!Array.isArray(value)) {
    errors.push({ message: `${path} must be an array`, path });
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== 'string' || !isAllowed(item, allowed)) {
      addEnumError(errors, `${path}/${index}`, item, allowed);
    }
  });
}

export function validateIdentityTokens(identity: unknown, basePath: string, errors: ValidationError[]): void {
  const id = validateObject(identity, basePath, errors);
  if (!id) return;

  for (const [key, allowed] of Object.entries(ENUM_FIELDS)) {
    validateEnum(errors, id, key, basePath, allowed);
  }

  const textDecoration = id.textDecoration;
  if (textDecoration !== undefined) {
    if (Array.isArray(textDecoration)) {
      validateStringArray(errors, textDecoration, `${basePath}/textDecoration`, TEXT_DECORATIONS);
    } else if (typeof textDecoration !== 'string' || !isAllowed(textDecoration, TEXT_DECORATIONS)) {
      addEnumError(errors, `${basePath}/textDecoration`, textDecoration, TEXT_DECORATIONS);
    }
  }

  validateNumberRange(errors, id, 'depth', basePath, 0, 1);
  validateNumberRange(errors, id, 'shadowAngle', basePath, 0, 360);
  validateNumberRange(errors, id, 'borderWidth', basePath, 0, 3);
  validateBoolean(errors, id, 'overrideSurfaceBorders', basePath);
  validateBoolean(errors, id, 'overrideInputButtons', basePath);

  const accent = validateObject(id.accentApplication, `${basePath}/accentApplication`, errors);
  if (accent) {
    for (const key of ['buttons', 'navItems', 'links', 'backgrounds', 'iconContainers']) {
      validateBoolean(errors, accent, key, `${basePath}/accentApplication`);
    }
    if (accent.cardLine !== undefined) {
      validateStringArray(errors, accent.cardLine, `${basePath}/accentApplication/cardLine`, CARD_LINE_POSITIONS);
    }
  }

  const layers = validateObject(id.coloredSurfaceLayers, `${basePath}/coloredSurfaceLayers`, errors);
  if (layers) {
    for (const key of ['background', 'surface', 'primitive']) {
      validateNumberRange(errors, layers, key, `${basePath}/coloredSurfaceLayers`, 0, 100);
    }
  }

  const gradients = validateObject(id.gradients, `${basePath}/gradients`, errors);
  if (gradients) {
    for (const key of ['buttons', 'cards', 'text']) {
      const value = gradients[key];
      if (value !== undefined && typeof value !== 'boolean' && (typeof value !== 'string' || !isAllowed(value, GRADIENT_MODES))) {
        addEnumError(errors, `${basePath}/gradients/${key}`, value, GRADIENT_MODES);
      }
    }
    validateBoolean(errors, gradients, 'headers', `${basePath}/gradients`);
  }

  const icons = validateObject(id.icons, `${basePath}/icons`, errors);
  if (icons) {
    validateEnum(errors, icons, 'weight', `${basePath}/icons`, ICON_WEIGHTS);
    validateEnum(errors, icons, 'container', `${basePath}/icons`, ICON_CONTAINERS);
    validateEnum(errors, icons, 'containerColor', `${basePath}/icons`, ICON_CONTAINER_COLORS);
  }

  const images = validateObject(id.images, `${basePath}/images`, errors);
  if (images) {
    validateEnum(errors, images, 'corners', `${basePath}/images`, IMAGE_CORNERS);
    validateEnum(errors, images, 'overlay', `${basePath}/images`, IMAGE_OVERLAYS);
    validateBoolean(errors, images, 'border', `${basePath}/images`);
  }
}
