import type { StructuralChange, StructuralDiff } from './types.js';

/**
 * Compute a semantic structural diff between two specs.
 * Type-aware: understands elements (screen/app), endpoints (api), navigation (app).
 * Shows before/after values for all changes.
 */
export function computeStructuralDiff(
  before: unknown,
  after: unknown,
  fromVersion: number,
  toVersion: number,
): StructuralDiff {
  const changes: StructuralChange[] = [];
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;

  const specType = detectSpecType(a) || detectSpecType(b) || 'screen';

  // Diff elements (screen specs and app layout)
  if (specType === 'screen' || specType === 'app') {
    const bElements = getElements(b, specType);
    const aElements = getElements(a, specType);
    diffElements(bElements, aElements, changes);
  }

  // Diff API spec sub-items (endpoints, catalogs) at item level
  if (specType === 'api') {
    diffNamedItems(b, a, 'endpoints', changes);
    diffNamedItems(b, a, 'catalogs', changes);
  }

  // Diff top-level sections (generic — for sections not handled above)
  const sectionKeys = getSectionKeys(specType);
  for (const key of sectionKeys) {
    if (JSON.stringify(b[key]) !== JSON.stringify(a[key])) {
      if (b[key] === undefined && a[key] !== undefined) {
        changes.push({ kind: 'section-changed', path: key, detail: `"${key}" added` });
      } else if (b[key] !== undefined && a[key] === undefined) {
        changes.push({ kind: 'section-changed', path: key, detail: `"${key}" removed` });
      } else {
        changes.push({ kind: 'section-changed', path: key, detail: `"${key}" changed` });
      }
    }
  }

  return {
    fromVersion,
    toVersion,
    changes,
    summary: buildSummary(changes),
  };
}

function detectSpecType(spec: Record<string, unknown>): 'screen' | 'api' | 'app' | null {
  const type = spec.type as string | undefined;
  if (type === 'api') return 'api';
  if (type === 'app') return 'app';
  if (spec.elements || spec.root) return 'screen';
  return null;
}

function getElements(spec: Record<string, unknown>, specType: string): Record<string, Record<string, unknown>> {
  if (specType === 'app') {
    const layout = spec.layout as Record<string, unknown> | undefined;
    return (layout?.elements ?? {}) as Record<string, Record<string, unknown>>;
  }
  return (spec.elements ?? {}) as Record<string, Record<string, unknown>>;
}

function getSectionKeys(specType: string): string[] {
  switch (specType) {
    case 'screen':
      return ['dataSources', 'initialActions', 'forms', 'derive', 'templates', 'tokens', 'translations', 'globalStyles'];
    case 'api':
      return ['auth', 'handlers']; // endpoints and catalogs are diffed at item level
    case 'app':
      return ['navigation', 'screens', 'sharedState', 'tokens', 'translations', 'templates'];
    default:
      return [];
  }
}

/** Format a value for display — short string for primitives, summary for objects */
function fmtVal(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value.length > 60 ? value.slice(0, 57) + '...' : value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length <= 3) return `{${keys.join(', ')}}`;
    return `{${keys.slice(0, 3).join(', ')}, ...${keys.length} keys}`;
  }
  return String(value);
}

/** Diff named sub-items within a section (e.g., endpoints, catalogs in api specs) */
function diffNamedItems(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  sectionKey: string,
  changes: StructuralChange[],
): void {
  const bSection = (before[sectionKey] ?? {}) as Record<string, Record<string, unknown>>;
  const aSection = (after[sectionKey] ?? {}) as Record<string, Record<string, unknown>>;
  const bKeys = new Set(Object.keys(bSection));
  const aKeys = new Set(Object.keys(aSection));

  for (const name of aKeys) {
    if (!bKeys.has(name)) {
      const item = aSection[name];
      const extra = item?.path && item?.method ? ` (${item.method} ${item.path})` : '';
      changes.push({
        kind: 'section-changed',
        path: `${sectionKey}/${name}`,
        detail: `${sectionKey} "${name}" added${extra}`,
      });
    }
  }

  for (const name of bKeys) {
    if (!aKeys.has(name)) {
      changes.push({
        kind: 'section-changed',
        path: `${sectionKey}/${name}`,
        detail: `${sectionKey} "${name}" removed`,
      });
    }
  }

  for (const name of bKeys) {
    if (!aKeys.has(name)) continue;
    const bItem = bSection[name];
    const aItem = aSection[name];
    if (JSON.stringify(bItem) === JSON.stringify(aItem)) continue;

    // Show which fields changed within the item
    const fieldChanges = diffFields(bItem, aItem);
    if (fieldChanges.length > 0) {
      for (const fc of fieldChanges) {
        changes.push({
          kind: 'section-changed',
          path: `${sectionKey}/${name}/${fc.field}`,
          detail: `${sectionKey} "${name}" ${fc.detail}`,
        });
      }
    } else {
      changes.push({
        kind: 'section-changed',
        path: `${sectionKey}/${name}`,
        detail: `${sectionKey} "${name}" changed`,
      });
    }
  }
}

/** Diff fields within an object and return per-field change descriptions */
function diffFields(before: Record<string, unknown>, after: Record<string, unknown>): Array<{ field: string; detail: string }> {
  const result: Array<{ field: string; detail: string }> = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const bVal = before[key];
    const aVal = after[key];
    if (JSON.stringify(bVal) === JSON.stringify(aVal)) continue;

    if (bVal === undefined) {
      result.push({ field: key, detail: `${key}: added ${fmtVal(aVal)}` });
    } else if (aVal === undefined) {
      result.push({ field: key, detail: `${key}: removed (was ${fmtVal(bVal)})` });
    } else {
      result.push({ field: key, detail: `${key}: ${fmtVal(bVal)} → ${fmtVal(aVal)}` });
    }
  }

  return result;
}

function diffElements(
  before: Record<string, Record<string, unknown>>,
  after: Record<string, Record<string, unknown>>,
  changes: StructuralChange[],
): void {
  const bKeys = new Set(Object.keys(before));
  const aKeys = new Set(Object.keys(after));

  for (const id of aKeys) {
    if (!bKeys.has(id)) {
      const type = (after[id].type as string) ?? 'unknown';
      changes.push({
        kind: 'element-added',
        elementId: id,
        path: `elements/${id}`,
        detail: `element "${id}" (${type}) added`,
      });
    }
  }

  for (const id of bKeys) {
    if (!aKeys.has(id)) {
      const type = (before[id].type as string) ?? 'unknown';
      changes.push({
        kind: 'element-removed',
        elementId: id,
        path: `elements/${id}`,
        detail: `element "${id}" (${type}) removed`,
      });
    }
  }

  for (const id of bKeys) {
    if (!aKeys.has(id)) continue;
    const bEl = before[id];
    const aEl = after[id];
    if (JSON.stringify(bEl) === JSON.stringify(aEl)) continue;

    // Collect all field-level changes for this element
    const elementChanges = diffFields(bEl, aEl);

    // For actions (on.*), show which events changed
    const bOn = bEl.on as Record<string, unknown> | undefined;
    const aOn = aEl.on as Record<string, unknown> | undefined;
    if (JSON.stringify(bOn) !== JSON.stringify(aOn)) {
      const onChanges = diffFields(bOn ?? {}, aOn ?? {});
      for (const oc of onChanges) {
        changes.push({
          kind: 'action-changed',
          elementId: id,
          path: `elements/${id}/on/${oc.field}`,
          detail: `element "${id}" on.${oc.detail}`,
        });
      }
      // Don't double-report — remove 'on' from elementChanges
      const remaining = elementChanges.filter(c => c.field !== 'on');
      for (const rc of remaining) {
        if (rc.field === 'props') {
          // Dig into props for specifics
          const propChanges = diffFields(
            (bEl.props ?? {}) as Record<string, unknown>,
            (aEl.props ?? {}) as Record<string, unknown>,
          );
          for (const pc of propChanges) {
            changes.push({
              kind: 'prop-changed',
              elementId: id,
              path: `elements/${id}/props/${pc.field}`,
              detail: `element "${id}" prop ${pc.detail}`,
            });
          }
        } else {
          changes.push({
            kind: 'prop-changed',
            elementId: id,
            path: `elements/${id}/${rc.field}`,
            detail: `element "${id}" ${rc.detail}`,
          });
        }
      }
      continue;
    }

    // No action changes — report prop and other changes
    for (const ec of elementChanges) {
      if (ec.field === 'props') {
        const propChanges = diffFields(
          (bEl.props ?? {}) as Record<string, unknown>,
          (aEl.props ?? {}) as Record<string, unknown>,
        );
        for (const pc of propChanges) {
          changes.push({
            kind: 'prop-changed',
            elementId: id,
            path: `elements/${id}/props/${pc.field}`,
            detail: `element "${id}" prop ${pc.detail}`,
          });
        }
      } else if (ec.field === 'type') {
        changes.push({
          kind: 'prop-changed',
          elementId: id,
          path: `elements/${id}/type`,
          detail: `element "${id}" type: ${fmtVal(bEl.type)} → ${fmtVal(aEl.type)}`,
        });
      } else {
        changes.push({
          kind: 'prop-changed',
          elementId: id,
          path: `elements/${id}/${ec.field}`,
          detail: `element "${id}" ${ec.detail}`,
        });
      }
    }
  }
}

function buildSummary(changes: StructuralChange[]): string {
  if (changes.length === 0) return 'No changes';

  const added = changes.filter(c => c.kind === 'element-added').length;
  const removed = changes.filter(c => c.kind === 'element-removed').length;
  const changed = changes.filter(c => c.kind !== 'element-added' && c.kind !== 'element-removed').length;

  const parts: string[] = [];
  if (added > 0) parts.push(`+${added} element${added > 1 ? 's' : ''}`);
  if (changed > 0) parts.push(`~${changed} change${changed > 1 ? 's' : ''}`);
  if (removed > 0) parts.push(`-${removed} element${removed > 1 ? 's' : ''}`);

  return parts.join(', ');
}
