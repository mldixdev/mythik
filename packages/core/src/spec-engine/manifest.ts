import type { Spec, Element, ActionBinding } from '../types.js';

/**
 * Generate a plain-text structural manifest of a spec.
 * Shows the element tree with annotations — no props, styles, or expression values.
 */
export function generateManifest(spec: Spec): string {
  const elementCount = Object.keys(spec.elements).length;
  const lines: string[] = [];

  lines.push(`screen: ${spec.root} (${elementCount} elements)`);

  if (spec.initialActions && spec.initialActions.length > 0) {
    const actionSummaries = spec.initialActions.map(summarizeAction).filter(Boolean);
    if (actionSummaries.length > 0) {
      lines.push(`initialActions: ${actionSummaries.join(', ')}`);
    }
  }

  lines.push('');

  const rootEl = spec.elements[spec.root];
  if (rootEl) {
    const annotations = buildAnnotations(rootEl);
    lines.push(`root: ${spec.root} (${rootEl.type})${annotations}`);
    if (rootEl.children && rootEl.children.length > 0) {
      appendChildren(spec, rootEl.children, lines, '');
    }
  }

  return lines.join('\n');
}

export function appendChildren(spec: { elements: Record<string, Element> }, childIds: string[], lines: string[], prefix: string): void {
  for (let i = 0; i < childIds.length; i++) {
    const id = childIds[i];
    const el = spec.elements[id];
    const isLast = i === childIds.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';

    if (!el) {
      lines.push(`${prefix}${connector}${id} (MISSING)`);
      continue;
    }

    const annotations = buildAnnotations(el);
    lines.push(`${prefix}${connector}${id} (${el.type})${annotations}`);

    if (el.children && el.children.length > 0) {
      appendChildren(spec, el.children, lines, prefix + childPrefix);
    }
  }
}

export function buildAnnotations(el: Element): string {
  const parts: string[] = [];

  if (el.repeat) {
    if (el.repeat.statePath) {
      parts.push(`repeat:${el.repeat.statePath}`);
    } else if (el.repeat.source) {
      parts.push('repeat:expression');
    }
  }

  if (el.visible !== undefined && el.visible !== true) {
    parts.push('visible:conditional');
  }

  if (el.on) {
    const events = Object.keys(el.on).sort().join(',');
    if (events) {
      parts.push(`on:${events}`);
    }
  }

  return parts.length > 0 ? ` → ${parts.join(', ')}` : '';
}

function summarizeAction(binding: ActionBinding | { transaction?: unknown }): string {
  if ('transaction' in binding) return 'transaction';
  const ab = binding as ActionBinding;
  if (ab.action === 'fetch' || ab.action === 'submitForm') {
    const method = (ab.params?.method as string) ?? 'GET';
    const target = (ab.params?.target as string) ?? '';
    return `${ab.action} ${method}${target ? ' → ' + target : ''}`;
  }
  return ab.action;
}
