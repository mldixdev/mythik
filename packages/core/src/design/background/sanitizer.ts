import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'circle', 'rect', 'path', 'line', 'polygon', 'polyline', 'ellipse',
  'g', 'defs', 'linearGradient', 'radialGradient', 'stop',
];

const ALLOWED_ATTR = [
  'cx', 'cy', 'r', 'rx', 'ry',
  'd',
  'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'width', 'height',
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
  'opacity', 'fill-opacity', 'stroke-opacity',
  'transform',
  'offset', 'points',
  'clip-path',
  'id', 'class',
];

// Pre-strip forbidden structural elements that confuse DOMPurify's SVG parser.
// foreignObject + iframe + use-with-href-external cause DOMPurify to bail on
// the entire SVG subtree in jsdom. We remove them via regex first, then
// DOMPurify handles the remaining whitelist enforcement on shapes + attrs.
function prestripForbidden(raw: string): string {
  return raw
    // Self-closing or with content
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^/>]*\/>/gi, '')
    .replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<foreignObject\b[^/>]*\/>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<iframe\b[^/>]*\/>/gi, '')
    .replace(/<use\b[^>]*>[\s\S]*?<\/use>/gi, '')
    .replace(/<use\b[^/>]*\/>/gi, '')
    .replace(/<image\b[^>]*>[\s\S]*?<\/image>/gi, '')
    .replace(/<image\b[^/>]*\/>/gi, '')
    // Also strip bare <a> that could wrap malicious content
    .replace(/<a\b[^>]*>/gi, '')
    .replace(/<\/a>/gi, '');
}

export function sanitizeSVGShapes(raw: string): string {
  // Defense in depth: regex-strip known-bad elements first, then DOMPurify
  // enforces whitelist on what remains.
  const prestripped = prestripForbidden(raw);
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg">${prestripped}</svg>`;
  const sanitized = DOMPurify.sanitize(wrapped, {
    ALLOWED_TAGS: ['svg', ...ALLOWED_TAGS],
    ALLOWED_ATTR: ['xmlns', ...ALLOWED_ATTR],
    PARSER_MEDIA_TYPE: 'image/svg+xml',
    IN_PLACE: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });
  return sanitized.replace(/^<svg[^>]*>/i, '').replace(/<\/svg>$/i, '').trim();
}
