const MOTION_ONLY_PROPS = new Set(['scale', 'scaleX', 'scaleY', 'rotate', 'x', 'y']);

export function needsMotionWrapper(
  ...fields: (Record<string, unknown> | undefined)[]
): boolean {
  for (const field of fields) {
    if (!field) continue;
    for (const key of Object.keys(field)) {
      if (MOTION_ONLY_PROPS.has(key)) return true;
    }
  }
  return false;
}

const EASE_MAP: Record<string, string> = {
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
};

function toKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function buildDeclarations(style: Record<string, unknown>): string {
  return Object.entries(style)
    .map(([key, value]) => `${toKebab(key)}: ${value}`)
    .join('; ');
}

interface InteractionFields {
  hover?: Record<string, unknown>;
  active?: Record<string, unknown>;
  focus?: Record<string, unknown>;
  transition?: { duration?: number; ease?: string; delay?: number };
}

export function generateHoverCSS(className: string, fields: InteractionFields): string {
  const rules: string[] = [];
  const duration = fields.transition?.duration ?? 150;
  const ease = EASE_MAP[fields.transition?.ease ?? 'easeOut'] ?? 'ease-out';
  const delay = fields.transition?.delay ?? 0;
  const transitionValue = `all ${duration}ms ${ease}${delay ? ` ${delay}ms` : ''}`;

  rules.push(`.${className} { transition: ${transitionValue}; }`);
  if (fields.hover) rules.push(`.${className}:hover { ${buildDeclarations(fields.hover)}; }`);
  if (fields.active) rules.push(`.${className}:active { ${buildDeclarations(fields.active)}; }`);
  if (fields.focus) rules.push(`.${className}:focus-visible { ${buildDeclarations(fields.focus)}; }`);

  return rules.join('\n');
}

export function hashId(elementId: string): string {
  // FNV-1a 32-bit for better distribution on short strings
  let hash = 0x811c9dc5;
  for (let i = 0; i < elementId.length; i++) {
    hash ^= elementId.charCodeAt(i);
    hash = (hash * 0x01000193) | 0;
  }
  return `sv-${(hash >>> 0).toString(36)}`;
}
