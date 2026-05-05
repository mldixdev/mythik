// buildCSSKeyframes — web output for animation engine.
// Produces { name, keyframesText, animationCSS } where name is a
// deterministic hash of content so the Constructable StyleSheets singleton
// can dedup. Layer 1 pure function.
//
// animationCSS shorthand order (matches CSS spec):
//   name duration easing delay iteration-count direction fill-mode
//
// The hash is djb2 over a canonical JSON fingerprint. 36-bit range is
// comfortably collision-safe for 15 curated recipes + reasonable user-added
// recipes. For unusual scale (>10k unique specs) consider a stronger hash.

import type { AnimationSpec } from './types.js';
import { normalizeKeyframeSnapshot, type NormalizedKeyframe } from './keyframes-builder.js';

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function stopToCSS(snapshot: NormalizedKeyframe): string {
  const declarations: string[] = [];
  if (snapshot.opacity !== undefined) declarations.push(`opacity: ${snapshot.opacity}`);
  if (snapshot.transformCSS) declarations.push(`transform: ${snapshot.transformCSS}`);
  if (snapshot.backgroundColor) declarations.push(`background-color: ${snapshot.backgroundColor}`);
  if (snapshot.borderColor) declarations.push(`border-color: ${snapshot.borderColor}`);
  if (snapshot.borderRadius) declarations.push(`border-radius: ${snapshot.borderRadius}`);
  if (snapshot.borderWidth !== undefined) declarations.push(`border-width: ${snapshot.borderWidth}px`);
  if (snapshot.color) declarations.push(`color: ${snapshot.color}`);
  if (snapshot.filterCSS) declarations.push(`filter: ${snapshot.filterCSS}`);
  if (snapshot.boxShadow !== undefined) declarations.push(`box-shadow: ${snapshot.boxShadow}`);
  return declarations.join('; ');
}

function fractionToPercentLabel(fraction: number): string {
  const pct = fraction * 100;
  if (Number.isInteger(pct)) return `${pct}%`;
  const rounded = Math.round(pct * 1000) / 1000;
  return `${rounded}%`;
}

export type BuiltCSSKeyframes = {
  name: string;
  keyframesText: string;
  animationCSS: string;
};

export function buildCSSKeyframes(spec: AnimationSpec): BuiltCSSKeyframes {
  const normalized = spec.keyframes.map(normalizeKeyframeSnapshot);
  const body = normalized
    .map((n) => {
      const stopLabel = fractionToPercentLabel(n.fraction);
      return `  ${stopLabel} { ${stopToCSS(n)} }`;
    })
    .join('\n');

  const fingerprint = JSON.stringify({
    kf: spec.keyframes,
    d: spec.duration,
    e: spec.easing,
    del: spec.delay,
    it: spec.iterations,
    dir: spec.direction,
    fm: spec.fillMode,
  });
  const name = `svka-${djb2(fingerprint)}`;

  const keyframesText = `@keyframes ${name} {\n${body}\n}`;

  const iterationsStr = spec.iterations === 'infinite' ? 'infinite' : `${spec.iterations}`;
  const animationCSS = `${name} ${spec.duration}ms ${spec.easing} ${spec.delay}ms ${iterationsStr} ${spec.direction} ${spec.fillMode}`;

  return { name, keyframesText, animationCSS };
}
