import { SPEC_KEYS, type Spec, type Element } from '../types.js';
import type { PrimitiveRegistry } from '../renderer/registry.js';
import type { ElementRegistry } from '../elements/composer.js';
import type { JsonPatch } from '../streaming/patch.js';
import { suggest } from '../utils/levenshtein.js';
import { COMMON_PROPS, TABLE_COLUMN_PROPS } from '../renderer/prop-schemas.js';
import type { PrimitiveSchema } from '../renderer/prop-schemas.js';
import { validateIdentityTokens } from './identity-token-validator.js';

export interface SuggestedFix {
  patch: JsonPatch;
  confidence: 'high';
  description: string;
}

/**
 * Validation error/warning structure used by all validators in `mythik`.
 *
 * @property message - Human-readable description.
 * @property elementId - Optional element ID context (Spec docs).
 * @property path - JSON Pointer path to the offending location.
 * @property suggestedFixes - Optional auto-fix patches (RFC 6902).
 * @property ruleId - Optional lint rule identifier (e.g. 'spec-row-literal').
 *   Convention: `<surface>-<short-name>` where surface ∈ `spec` | `code`.
 *   Set by lint-rule emitters; left undefined for non-lint validation errors.
 *   Used by `runLint` orchestrator to identify lint findings vs other output.
 */
export interface ValidationError {
  message: string;
  elementId?: string;
  path?: string;
  suggestedFixes?: SuggestedFix[];
  ruleId?: string;
}

export interface SpecValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
  /**
   * Additive lint findings (v49 Item I). For ApiSpec docs, this propagates
   * `ApiSpecValidationResult.lintWarnings` through the DocumentHandler boundary
   * so `mythik validate` / `mythik push` can surface rules 2+3 (spec-crud-id-collision,
   * spec-auth-domains-port). For Spec docs, lint findings emit via `warnings` with
   * `ruleId` set; this field stays undefined.
   */
  lintWarnings?: ValidationError[];
}

export interface ValidationContext {
  primitiveRegistry?: PrimitiveRegistry;
  /** Layer 3 element definitions. Types present here are NOT flagged as "unknown primitive type" — custom elements dispatch through the ElementRegistry at render time. */
  elementRegistry?: ElementRegistry;
  /** Primitive types that support CSS className for hover/active/focus. If provided, elements with CSS-only interactions on unsupported types generate warnings. */
  cssHoverTypes?: Set<string>;
  /** Generate suggested fix patches for auto-fixable errors. Default: true */
  generateFixes?: boolean;
  /** Tokens object for variant validation. When provided, checks that variant references exist in tokens.components. */
  variantTokens?: Record<string, unknown>;
  /** Valid prop names per primitive type. When provided, unknown props generate warnings. */
  propSchemas?: Record<string, PrimitiveSchema>;
}

/** Expression handler rules: required properties and operation-specific requirements */
const EXPRESSION_RULES: Record<string, { required?: string[]; operations?: Record<string, { required?: string[] }> }> = {
  $state: { required: ['$state'] },
  $bindState: { required: ['$bindState'] },
  $token: { required: ['$token'] },
  $template: { required: ['$template'] },
  $computed: { required: ['$computed'] },
  $ref: { required: ['$ref'] },
  $item: { required: ['$item'] },
  $index: {},
  $bindItem: { required: ['$bindItem'] },
  $prop: { required: ['$prop'] },
  $i18n: { required: ['$i18n'] },
  $not: { required: ['$not'] },
  $and: { required: ['$and'] },
  $or: { required: ['$or'] },
  $breakpoint: { required: ['$breakpoint'] },
  $cond: { required: ['$cond', '$then', '$else'] },
  $switch: { required: ['$switch', 'cases', 'default'] },
  $group: { required: ['$group'] },
  $selection: { required: ['$selection'] },
  $uniqueId: { required: ['$uniqueId', 'source'] },
  $let: { required: ['$let', '$in'] },
  $format: { required: ['$format', 'value'] },
  $math: {
    required: ['$math'],
    operations: {
      add: { required: ['args'] }, subtract: { required: ['args'] }, multiply: { required: ['args'] },
      divide: { required: ['args'] }, mod: { required: ['args'] }, min: { required: ['args'] }, max: { required: ['args'] },
      round: { required: ['value'] }, floor: { required: ['value'] }, ceil: { required: ['value'] }, abs: { required: ['value'] },
    },
  },
  $date: {
    required: ['$date'],
    operations: {
      now: {}, today: {},
      age: { required: ['from'] }, diff: { required: ['from'] },
      format: { required: ['value'] }, add: { required: ['value', 'amount'] },
    },
  },
  $array: {
    required: ['$array', 'source'],
    operations: {
      count: {}, length: {}, first: {}, last: {}, slice: {}, filter: {},
      sum: { required: ['field'] }, sumProduct: { required: ['field1', 'field2'] },
      remove: { required: ['where'] }, replace: { required: ['where', 'value'] },
      append: { required: ['value'] }, toggle: { required: ['value'] },
      search: { required: ['query'] }, includes: { required: ['value'] },
      sort: { required: ['field'] }, map: { required: ['field'] }, find: { required: ['where'] },
    },
  },
};

/** Required params per built-in action */
const ACTION_REQUIRED_PARAMS: Record<string, string[]> = {
  setState: ['statePath'],
  fetch: ['url'],
  submitForm: ['url'],
  navigate: ['screen'],
  setLocale: ['locale'],
  uploadFile: ['bucket', 'target'],
  deleteFile: ['path', 'bucket'],
  export: ['source', 'columns', 'filename'],
  editorCommit: ['session', 'changes'],
  editorUndo: ['session'],
  editorRedo: ['session'],
  editorMarkSaved: ['session'],
  editorSave: ['session'],
  editorDiscard: ['session'],
  editorValidate: ['session'],
};

function validateExpression(expr: unknown, elementId: string, exprPath: string, errors: ValidationError[]): void {
  if (expr === null || expr === undefined || typeof expr !== 'object') return;
  if (Array.isArray(expr)) {
    for (let i = 0; i < expr.length; i++) {
      validateExpression(expr[i], elementId, `${exprPath}.${i}`, errors);
    }
    return;
  }

  const obj = expr as Record<string, unknown>;
  const exprKey = Object.keys(obj).find((k) => k.startsWith('$') && EXPRESSION_RULES[k]);
  if (!exprKey) {
    for (const [key, val] of Object.entries(obj)) {
      if (val && typeof val === 'object') {
        validateExpression(val, elementId, `${exprPath}.${key}`, errors);
      }
    }
    return;
  }

  const rules = EXPRESSION_RULES[exprKey];

  if (rules.required) {
    for (const prop of rules.required) {
      if (obj[prop] === undefined) {
        errors.push({
          message: `Element "${elementId}": ${exprKey} at ${exprPath} requires "${prop}" property`,
          elementId,
          path: `/elements/${elementId}/${exprPath.replace(/\./g, '/')}`,
        });
      }
    }
  }

  if (exprKey === '$state' && obj.$state !== undefined && typeof obj.$state !== 'string') {
    errors.push({
      message: `Element "${elementId}": $state at ${exprPath} requires a string path`,
      elementId,
      path: `/elements/${elementId}/${exprPath.replace(/\./g, '/')}/$state`,
    });
  }

  if (rules.operations) {
    const operation = obj[exprKey] as string;
    if (typeof operation === 'string' && rules.operations[operation]) {
      const opRules = rules.operations[operation];
      if (opRules.required) {
        for (const prop of opRules.required) {
          if (obj[prop] === undefined) {
            errors.push({
              message: `Element "${elementId}": ${exprKey} "${operation}" at ${exprPath} requires "${prop}" property`,
              elementId,
              path: `/elements/${elementId}/${exprPath.replace(/\./g, '/')}`,
            });
          }
        }
      }
    }
  }

  for (const [key, val] of Object.entries(obj)) {
    if (key !== exprKey && val && typeof val === 'object') {
      validateExpression(val, elementId, `${exprPath}.${key}`, errors);
    }
  }
}

function validateActionBinding(
  binding: unknown,
  elementId: string,
  eventPath: string,
  errors: ValidationError[],
  spec?: Spec,
): void {
  if (!binding || typeof binding !== 'object') return;
  if ('transaction' in (binding as Record<string, unknown>)) return;

  const b = binding as Record<string, unknown>;
  const action = b.action as string | undefined;
  if (!action) return;

  const requiredParams = ACTION_REQUIRED_PARAMS[action];

  if (b.params && typeof b.params === 'object') {
    const params = b.params as Record<string, unknown>;
    if (requiredParams) {
      for (const param of requiredParams) {
        if (params[param] === undefined) {
          errors.push({
            message: `Element "${elementId}": action "${action}" at ${eventPath} requires "${param}" param`,
            elementId,
            path: `/elements/${elementId}/${eventPath.replace(/\./g, '/')}`,
          });
        }
      }
    }
    for (const [paramName, paramValue] of Object.entries(params)) {
      validateExpression(paramValue, elementId, `${eventPath}.params.${paramName}`, errors);
    }
    validateEditorSaveAction(action, params, elementId, eventPath, errors, spec);
  } else if (requiredParams) {
    for (const param of requiredParams) {
      errors.push({
        message: `Element "${elementId}": action "${action}" at ${eventPath} requires "${param}" param`,
        elementId,
        path: `/elements/${elementId}/${eventPath.replace(/\./g, '/')}`,
      });
    }
  }
}

function validateEditorSaveAction(
  action: string,
  params: Record<string, unknown>,
  elementId: string,
  eventPath: string,
  errors: ValidationError[],
  spec?: Spec,
): void {
  if (action !== 'editorSave') return;
  if (typeof params.session !== 'string' || !params.session) return;

  const sessionId = params.session;
  const sessions = spec?.editorSessions;
  const session = sessions?.[sessionId];
  if (!session) {
    errors.push({
      message: `Element "${elementId}": editorSave at ${eventPath} references unknown editor session "${sessionId}"`,
      elementId,
      path: `/elements/${elementId}/${eventPath.replace(/\./g, '/')}/params/session`,
    });
    return;
  }

  if (!session.persistence && params.url === undefined) {
    errors.push({
      message: `Element "${elementId}": editorSave at ${eventPath} requires session persistence or params.url`,
      elementId,
      path: `/elements/${elementId}/${eventPath.replace(/\./g, '/')}/params`,
    });
  }
}

/**
 * Lint walker — detects `$row` literal usage in spec values.
 *
 * `$row` is not a valid expression handler in Mythik — it was a historical doc lie
 * removed in v49 Item B. AI consumers may still generate it from training data.
 * Runtime resolves to undefined silently; lint catches at validate/push/lint time.
 *
 * Emits warnings to the provided array with `ruleId: 'spec-row-literal'`.
 * Suggested fix: replace `{ $row: 'X' }` with `{ $state: '/ui/selectedRow/X' }`.
 */
function validateEditorSessions(spec: Spec, errors: ValidationError[]): void {
  const sessions = spec.editorSessions;
  if (sessions === undefined) return;
  if (!sessions || typeof sessions !== 'object' || Array.isArray(sessions)) {
    errors.push({ message: 'editorSessions must be an object keyed by session id', path: '/editorSessions' });
    return;
  }

  for (const [sessionId, rawConfig] of Object.entries(sessions)) {
    const basePath = `/editorSessions/${sessionId}`;
    if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
      errors.push({ message: `editorSession "${sessionId}" must be an object`, path: basePath });
      continue;
    }

    const config = rawConfig as unknown as Record<string, unknown>;
    const paths = config.paths;
    if (!Array.isArray(paths) || paths.length === 0) {
      errors.push({ message: `editorSession "${sessionId}" requires at least one path`, path: `${basePath}/paths` });
    } else {
      paths.forEach((path, index) => {
        if (typeof path !== 'string' || !path.startsWith('/')) {
          errors.push({
            message: `editorSession "${sessionId}" path must start with "/"`,
            path: `${basePath}/paths/${index}`,
          });
        }
        if (path === '/ui' || (typeof path === 'string' && path.startsWith('/ui/'))) {
          errors.push({
            message: `editorSession "${sessionId}" should not track transient /ui paths`,
            path: `${basePath}/paths/${index}`,
          });
        }
      });
    }

    if (
      config.maxHistory !== undefined
      && (!Number.isInteger(config.maxHistory) || (config.maxHistory as number) < 1)
    ) {
      errors.push({ message: `editorSession "${sessionId}" maxHistory must be a positive integer`, path: `${basePath}/maxHistory` });
    }

    const persistence = config.persistence;
    if (persistence !== undefined) {
      if (!persistence || typeof persistence !== 'object' || Array.isArray(persistence)) {
        errors.push({ message: `editorSession "${sessionId}" persistence must be an object`, path: `${basePath}/persistence` });
      } else {
        const rawPersistence = persistence as Record<string, unknown>;
        if (rawPersistence.url === undefined) {
          errors.push({ message: `editorSession "${sessionId}" persistence requires url`, path: `${basePath}/persistence/url` });
        }
        if (
          rawPersistence.method !== undefined
          && !['POST', 'PUT', 'PATCH'].includes(String(rawPersistence.method))
        ) {
          errors.push({ message: `editorSession "${sessionId}" persistence method must be POST, PUT, or PATCH`, path: `${basePath}/persistence/method` });
        }
        if (
          rawPersistence.body !== undefined
          && rawPersistence.body !== 'trackedPaths'
          && rawPersistence.body !== 'snapshot'
          && (typeof rawPersistence.body !== 'object' || rawPersistence.body === null || Array.isArray(rawPersistence.body))
        ) {
          errors.push({ message: `editorSession "${sessionId}" persistence body must be "trackedPaths", "snapshot", or an object`, path: `${basePath}/persistence/body` });
        }
      }
    }
  }
}

function walkForRowLiteral(value: unknown, jsonPath: string, warnings: ValidationError[]): void {
  if (value === null || value === undefined) return;
  if (typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkForRowLiteral(value[i], `${jsonPath}/${i}`, warnings);
    }
    return;
  }
  const obj = value as Record<string, unknown>;
  if ('$row' in obj) {
    const rowValue = obj.$row;
    const inferredKey = typeof rowValue === 'string' ? rowValue : '<key>';
    warnings.push({
      message: `$row is not a valid expression handler — use $state with /ui/selectedRow path`,
      path: jsonPath,
      ruleId: 'spec-row-literal',
      suggestedFixes: [{
        patch: { op: 'replace', path: jsonPath, value: { $state: `/ui/selectedRow/${inferredKey}` } } as JsonPatch,
        confidence: 'high',
        description: `Replace $row with /ui/selectedRow/${inferredKey}`,
      }],
    });
    return; // Don't descend into the $row object itself
  }
  for (const [key, val] of Object.entries(obj)) {
    walkForRowLiteral(val, `${jsonPath}/${key}`, warnings);
  }
}

/**
 * Validates a Spec structure before rendering.
 * With primitiveRegistry: also validates primitive types, expressions, and action params.
 */
export function validateSpec(spec: unknown, context: ValidationContext = {}): SpecValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const doFixes = context.generateFixes !== false;

  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: [{ message: 'Spec must be an object' }] };
  }

  const s = spec as Record<string, unknown>;

  if (!s.root || typeof s.root !== 'string') {
    errors.push({ message: 'Spec must have a "root" string property' });
  }

  if (!s.elements || typeof s.elements !== 'object' || Array.isArray(s.elements)) {
    errors.push({ message: 'Spec must have an "elements" object property' });
  }

  if (errors.length > 0) return { valid: false, errors };

  // Warn on unknown top-level properties (typo detection)
  const specKeySet = new Set<string>(SPEC_KEYS);
  for (const key of Object.keys(s)) {
    if (!specKeySet.has(key)) {
      const warning: ValidationError = {
        message: `Unknown top-level property "${key}"`,
        path: `/${key}`,
      };
      if (doFixes) {
        const suggested = suggest(key, SPEC_KEYS as unknown as string[]);
        if (suggested) {
          warning.suggestedFixes = [{
            patch: { op: 'remove', path: `/${key}` },
            confidence: 'high',
            description: `did you mean '${suggested}'?`,
          }];
        }
      }
      warnings.push(warning);
    }
  }

  validateEditorSessions(s as unknown as Spec, errors);

  const elements = s.elements as Record<string, unknown>;
  const root = s.root as string;

  if (s.tokens && typeof s.tokens === 'object' && !Array.isArray(s.tokens)) {
    const tokens = s.tokens as Record<string, unknown>;
    if (tokens.identity !== undefined) {
      validateIdentityTokens(tokens.identity, '/tokens/identity', errors);
    }
  }

  if (!elements[root]) {
    errors.push({ message: `Root element "${root}" not found in elements` });
  }

  // Collect orphan child errors per parent for descending index ordering
  const orphanErrors: ValidationError[] = [];

  for (const [id, element] of Object.entries(elements)) {
    if (!element || typeof element !== 'object') {
      errors.push({ message: `Element "${id}" must be an object`, elementId: id });
      continue;
    }

    const el = element as Record<string, unknown>;

    if (!el.type || typeof el.type !== 'string') {
      errors.push({ message: `Element "${id}" must have a "type" string property`, elementId: id, path: `/elements/${id}/type` });
    }

    // Validate primitive type exists in registry — auto-fix #1
    // Also accept Layer 3 custom elements registered via ElementRegistry.
    if (context.primitiveRegistry && el.type && typeof el.type === 'string') {
      const isPrimitive = context.primitiveRegistry.has(el.type);
      const isCustomElement = context.elementRegistry?.has(el.type) ?? false;
      if (!isPrimitive && !isCustomElement) {
        const error: ValidationError = {
          message: `Element "${id}": unknown primitive type "${el.type}"`,
          elementId: id,
          path: `/elements/${id}/type`,
        };
        if (doFixes) {
          const candidates = [
            ...context.primitiveRegistry.keys(),
            ...(context.elementRegistry ? [...context.elementRegistry.getAll().keys()] : []),
          ];
          const suggested = suggest(el.type, candidates);
          if (suggested) {
            error.suggestedFixes = [{
              patch: { op: 'replace', path: `/elements/${id}/type`, value: suggested },
              confidence: 'high',
              description: `type '${el.type}' → '${suggested}' (Levenshtein match)`,
            }];
          }
        }
        errors.push(error);
      }
    }

    // Children — orphan detection with auto-fix #2
    if (el.children !== undefined) {
      if (!Array.isArray(el.children)) {
        errors.push({ message: `Element "${id}": "children" must be an array`, elementId: id, path: `/elements/${id}/children` });
      } else {
        for (let i = 0; i < el.children.length; i++) {
          const childId = el.children[i];
          if (typeof childId !== 'string') {
            errors.push({ message: `Element "${id}": children must be strings (element IDs)`, elementId: id, path: `/elements/${id}/children/${i}` });
          } else if (!elements[childId]) {
            const error: ValidationError = {
              message: `Element "${id}": child "${childId}" not found in elements`,
              elementId: id,
              path: `/elements/${id}/children/${i}`,
            };
            if (doFixes) {
              error.suggestedFixes = [{
                patch: { op: 'remove', path: `/elements/${id}/children/${i}` },
                confidence: 'high',
                description: `remove orphan child '${childId}' at index ${i}`,
              }];
            }
            orphanErrors.push(error);
          }
        }
      }
    }

    if (el.props !== undefined && (typeof el.props !== 'object' || Array.isArray(el.props))) {
      errors.push({ message: `Element "${id}": "props" must be an object`, elementId: id, path: `/elements/${id}/props` });
    }

    if (el.style !== undefined && (typeof el.style !== 'object' || Array.isArray(el.style))) {
      errors.push({ message: `Element "${id}": "style" must be an object`, elementId: id, path: `/elements/${id}/style` });
    }

    if (el.props && typeof el.props === 'object' && !Array.isArray(el.props)) {
      for (const [propName, propVal] of Object.entries(el.props as Record<string, unknown>)) {
        if (propVal && typeof propVal === 'object') {
          validateExpression(propVal, id, `props.${propName}`, errors);
        }
      }

      // Validate prop names against primitive schema
      if (context.propSchemas && el.type && typeof el.type === 'string') {
        const knownProps = context.propSchemas[el.type as string]?.validProps;
        if (knownProps) {
          for (const propName of Object.keys(el.props as Record<string, unknown>)) {
            if (COMMON_PROPS.has(propName)) continue;
            if (!knownProps.includes(propName)) {
              const warning: ValidationError = {
                message: `Element "${id}": unknown prop "${propName}" for type "${el.type}"`,
                elementId: id,
                path: `/elements/${id}/props/${propName}`,
              };
              if (doFixes) {
                const suggested = suggest(propName, knownProps);
                if (suggested) {
                  warning.suggestedFixes = [{
                    patch: { op: 'replace', path: `/elements/${id}/props/${propName}`, value: suggested },
                    confidence: 'high',
                    description: `did you mean '${suggested}'?`,
                  }];
                }
              }
              warnings.push(warning);
            }
          }
        }
      }

      // Validate table column props
      if (el.type === 'table' && context.propSchemas) {
        const cols = (el.props as Record<string, unknown>)?.columns;
        if (Array.isArray(cols)) {
          const colKeySet = new Set<string>(TABLE_COLUMN_PROPS);
          for (let ci = 0; ci < cols.length; ci++) {
            const col = cols[ci];
            if (col && typeof col === 'object' && !Array.isArray(col)) {
              for (const colKey of Object.keys(col as Record<string, unknown>)) {
                if (!colKeySet.has(colKey)) {
                  const warning: ValidationError = {
                    message: `Element "${id}": unknown column prop "${colKey}" at columns[${ci}]`,
                    elementId: id,
                    path: `/elements/${id}/props/columns/${ci}/${colKey}`,
                  };
                  if (doFixes) {
                    const suggested = suggest(colKey, TABLE_COLUMN_PROPS as unknown as string[]);
                    if (suggested) {
                      warning.suggestedFixes = [{
                        patch: { op: 'replace', path: `/elements/${id}/props/columns/${ci}/${colKey}`, value: suggested },
                        confidence: 'high',
                        description: `did you mean '${suggested}'?`,
                      }];
                    }
                  }
                  warnings.push(warning);
                }
              }
            }
          }
        }
      }
    }

    if (el.style && typeof el.style === 'object' && !Array.isArray(el.style)) {
      for (const [styleProp, styleVal] of Object.entries(el.style as Record<string, unknown>)) {
        if (styleVal && typeof styleVal === 'object') {
          validateExpression(styleVal, id, `style.${styleProp}`, errors);
        }
      }
    }

    if (el.visible && typeof el.visible === 'object') {
      validateExpression(el.visible, id, 'visible', errors);
    }

    if (el.on !== undefined && (typeof el.on !== 'object' || Array.isArray(el.on))) {
      errors.push({ message: `Element "${id}": "on" must be an object`, elementId: id, path: `/elements/${id}/on` });
    }

    if (el.on && typeof el.on === 'object' && !Array.isArray(el.on)) {
      for (const [eventName, binding] of Object.entries(el.on as Record<string, unknown>)) {
        if (binding && typeof binding === 'object' && !Array.isArray(binding) && 'transaction' in (binding as Record<string, unknown>)) {
          const tx = (binding as Record<string, unknown>).transaction;
          if (!tx || typeof tx !== 'object' || Array.isArray(tx)) {
            errors.push({ message: `Element "${id}": on.${eventName}.transaction must be an object`, elementId: id, path: `/elements/${id}/on/${eventName}/transaction` });
            continue;
          }
          const txObj = tx as Record<string, unknown>;

          if (!txObj.confirm || !Array.isArray(txObj.confirm) || (txObj.confirm as unknown[]).length === 0) {
            errors.push({ message: `Element "${id}": on.${eventName}.transaction.confirm is required and must be a non-empty array`, elementId: id, path: `/elements/${id}/on/${eventName}/transaction/confirm` });
          }

          for (const phase of ['before', 'optimistic', 'onSuccess', 'onError']) {
            if (txObj[phase] !== undefined && !Array.isArray(txObj[phase])) {
              errors.push({ message: `Element "${id}": on.${eventName}.transaction.${phase} must be an array`, elementId: id, path: `/elements/${id}/on/${eventName}/transaction/${phase}` });
            }
          }

          if (txObj.timeout !== undefined) {
            if (typeof txObj.timeout !== 'number' || txObj.timeout <= 0) {
              errors.push({ message: `Element "${id}": on.${eventName}.transaction.timeout must be a positive number`, elementId: id, path: `/elements/${id}/on/${eventName}/transaction/timeout` });
            }
          }

          for (const phase of ['before', 'optimistic', 'confirm', 'onSuccess', 'onError']) {
            if (Array.isArray(txObj[phase])) {
              for (const action of txObj[phase] as unknown[]) {
                if (action && typeof action === 'object' && 'transaction' in (action as Record<string, unknown>)) {
                  errors.push({ message: `Element "${id}": on.${eventName}.transaction.${phase} cannot contain nested transactions`, elementId: id, path: `/elements/${id}/on/${eventName}/transaction/${phase}` });
                }
                validateActionBinding(action, id, `on.${eventName}.transaction.${phase}`, errors, s as unknown as Spec);
              }
            }
          }
        } else if (Array.isArray(binding)) {
          for (const action of binding) {
            validateActionBinding(action, id, `on.${eventName}`, errors, s as unknown as Spec);
          }
        } else if (binding && typeof binding === 'object') {
          validateActionBinding(binding, id, `on.${eventName}`, errors, s as unknown as Spec);
        }
      }
    }

    if (el.repeat !== undefined) {
      const repeat = el.repeat as Record<string, unknown>;
      if (!repeat.statePath && !repeat.source && !repeat.count) {
        errors.push({ message: `Element "${id}": "repeat" must have "statePath", "source", or "count"`, elementId: id, path: `/elements/${id}/repeat` });
      }
    }

    if (context.cssHoverTypes && el.type && typeof el.type === 'string') {
      const hasCssInteraction = el.hover || el.active || el.focus;
      if (hasCssInteraction && !context.cssHoverTypes.has(el.type)) {
        const fields = [el.hover && 'hover', el.active && 'active', el.focus && 'focus'].filter(Boolean).join(', ');
        errors.push({ message: `Element "${id}": has ${fields} but type "${el.type}" does not support CSS className — interaction will be silently ignored. Use transform-based props (scale, y, rotate) for Motion wrapper, or add className support to the primitive`, elementId: id, path: `/elements/${id}` });
      }
    }

    // Toast-container validation — auto-fix #3
    if (el.type === 'toast-container' && el.props && typeof el.props === 'object') {
      const props = el.props as Record<string, unknown>;
      const validPositions = ['top-right', 'top-left', 'top-center', 'bottom-right', 'bottom-left', 'bottom-center'];
      if (props.position !== undefined && !validPositions.includes(props.position as string)) {
        const error: ValidationError = {
          message: `Element "${id}": toast-container position must be one of: ${validPositions.join(', ')}`,
          elementId: id,
          path: `/elements/${id}/props/position`,
        };
        if (doFixes) {
          const suggested = suggest(props.position as string, validPositions);
          if (suggested) {
            error.suggestedFixes = [{
              patch: { op: 'replace', path: `/elements/${id}/props/position`, value: suggested },
              confidence: 'high',
              description: `position '${props.position}' → '${suggested}' (Levenshtein match)`,
            }];
          }
        }
        errors.push(error);
      }
      if (props.duration !== undefined && props.duration !== null && typeof props.duration !== 'number') {
        errors.push({ message: `Element "${id}": toast-container duration must be a number or null`, elementId: id, path: `/elements/${id}/props/duration` });
      }
      if (props.maxVisible !== undefined && (typeof props.maxVisible !== 'number' || props.maxVisible < 1)) {
        errors.push({ message: `Element "${id}": toast-container maxVisible must be a positive number`, elementId: id, path: `/elements/${id}/props/maxVisible` });
      }
    }

    if (el.type === 'table' && el.props && typeof el.props === 'object') {
      const props = el.props as Record<string, unknown>;
      if (props.sorting && typeof props.sorting === 'object') {
        const sorting = props.sorting as Record<string, unknown>;
        if (sorting.enabled && sorting.mode === 'server' && !sorting.state) {
          errors.push({ message: `Element "${id}": table sorting.mode "server" requires "state" path`, elementId: id, path: `/elements/${id}/props/sorting/state` });
        }
      }
      if (props.pagination && typeof props.pagination === 'object') {
        const pagination = props.pagination as Record<string, unknown>;
        if (pagination.enabled && pagination.mode === 'server' && !pagination.state) {
          errors.push({ message: `Element "${id}": table pagination.mode "server" requires "state" path`, elementId: id, path: `/elements/${id}/props/pagination/state` });
        }
      }
    }

    // File-upload validation
    if (el.type === 'file-upload' && el.props && typeof el.props === 'object') {
      const props = el.props as Record<string, unknown>;
      if (props.maxSize !== undefined && (typeof props.maxSize !== 'number' || props.maxSize <= 0)) {
        errors.push({ message: `Element "${id}": file-upload maxSize must be a positive number`, elementId: id, path: `/elements/${id}/props/maxSize` });
      }
      if (props.maxFiles !== undefined && (typeof props.maxFiles !== 'number' || props.maxFiles <= 0 || !Number.isInteger(props.maxFiles))) {
        errors.push({ message: `Element "${id}": file-upload maxFiles must be a positive integer`, elementId: id, path: `/elements/${id}/props/maxFiles` });
      }
    }

    // Skeleton validation
    if (el.type === 'skeleton' && el.props && typeof el.props === 'object') {
      const props = el.props as Record<string, unknown>;
      const validVariants = ['text', 'circle', 'rect'];
      if (props.variant !== undefined && !validVariants.includes(props.variant as string)) {
        errors.push({ message: `Element "${id}": skeleton variant must be one of ${validVariants.join(', ')}`, elementId: id, path: `/elements/${id}/props/variant` });
      }
      if (props.height !== undefined && (typeof props.height !== 'number' || props.height <= 0)) {
        errors.push({ message: `Element "${id}": skeleton height must be a positive number`, elementId: id, path: `/elements/${id}/props/height` });
      }
      if (props.count !== undefined && (typeof props.count !== 'number' || props.count <= 0 || !Number.isInteger(props.count))) {
        errors.push({ message: `Element "${id}": skeleton count must be a positive integer`, elementId: id, path: `/elements/${id}/props/count` });
      }
      if (props.gap !== undefined && (typeof props.gap !== 'number' || props.gap < 0)) {
        errors.push({ message: `Element "${id}": skeleton gap must be a non-negative number`, elementId: id, path: `/elements/${id}/props/gap` });
      }
    }

    // Variant validation
    if (el.props && typeof el.props === 'object') {
      const props = el.props as Record<string, unknown>;
      const variantVal = props.variant;
      if (variantVal && typeof variantVal === 'string' && context?.variantTokens) {
        const components = (context.variantTokens as Record<string, unknown>).components as Record<string, Record<string, unknown>> | undefined;
        if (components) {
          const elType = el.type as string;
          const typeVariants = components[elType];
          if (!typeVariants || !typeVariants[variantVal]) {
            errors.push({
              message: `Element "${id}": variant "${variantVal}" not found in tokens.components.${elType}`,
              elementId: id,
              path: `/elements/${id}/props/variant`,
            });
          }
        }
      }
    }
  }

  // Add orphan errors sorted by descending index (for safe sequential patch application)
  orphanErrors.sort((a, b) => {
    const idxA = parseInt(a.path!.split('/').pop()!, 10);
    const idxB = parseInt(b.path!.split('/').pop()!, 10);
    return idxB - idxA;
  });
  errors.push(...orphanErrors);

  // Lint rule: spec-row-literal — walk all elements for $row literal usage.
  for (const [id, element] of Object.entries(elements)) {
    if (element && typeof element === 'object') {
      walkForRowLiteral(element, `/elements/${id}`, warnings);
    }
  }

  // Validate derive section
  if (s.derive && typeof s.derive === 'object' && !Array.isArray(s.derive)) {
    const derive = s.derive as Record<string, unknown>;
    const derivePaths = new Set(Object.keys(derive));

    const deriveDeps = new Map<string, Set<string>>();
    for (const [derivePath, expr] of Object.entries(derive)) {
      const deps = new Set<string>();
      function walkDerive(v: unknown): void {
        if (v === null || v === undefined || typeof v !== 'object') return;
        if (Array.isArray(v)) { for (const item of v) walkDerive(item); return; }
        const obj = v as Record<string, unknown>;
        if ('$state' in obj && typeof obj.$state === 'string') deps.add(obj.$state);
        for (const val of Object.values(obj)) walkDerive(val);
      }
      walkDerive(expr);
      deriveDeps.set(derivePath, deps);

      validateExpression(expr, `derive:${derivePath}`, 'derive', errors);
    }

    const dVisited = new Set<string>();
    const dVisiting = new Set<string>();
    function visitDerive(derivePath: string): void {
      if (dVisited.has(derivePath)) return;
      if (dVisiting.has(derivePath)) {
        errors.push({ message: `Derive circular dependency: "${derivePath}" depends on itself (direct or indirect cycle)` });
        return;
      }
      dVisiting.add(derivePath);
      const deps = deriveDeps.get(derivePath) ?? new Set();
      for (const dep of deps) {
        if (derivePaths.has(dep)) visitDerive(dep);
      }
      dVisiting.delete(derivePath);
      dVisited.add(derivePath);
    }
    for (const derivePath of derivePaths) visitDerive(derivePath);
  }

  // Validate dataSources
  if (s.dataSources && typeof s.dataSources === 'object') {
    for (const [dsId, ds] of Object.entries(s.dataSources as Record<string, Record<string, unknown>>)) {
      if (!ds.url) errors.push({ message: `dataSource "${dsId}" requires "url"`, path: `/dataSources/${dsId}/url` });
      if (!ds.target) errors.push({ message: `dataSource "${dsId}" requires "target"`, path: `/dataSources/${dsId}/target` });
    }
  }

  // Validate templates
  if (s.templates && typeof s.templates === 'object') {
    for (const [tmplId, tmpl] of Object.entries(s.templates as Record<string, Record<string, unknown>>)) {
      if (!tmpl.type || typeof tmpl.type !== 'string') {
        errors.push({ message: `template "${tmplId}" requires "type" string`, path: `/templates/${tmplId}/type` });
      }
    }
  }

  // Validate forms config — auto-fix #4
  if (s.forms && typeof s.forms === 'object') {
    const knownValidators = new Set([
      'required', 'email', 'minLength', 'maxLength', 'pattern',
      'min', 'max', 'numeric', 'url', 'matches', 'equalTo',
      'lessThan', 'greaterThan', 'requiredIf',
    ]);
    for (const [formId, form] of Object.entries(s.forms as Record<string, Record<string, unknown>>)) {
      if (!form.fields || typeof form.fields !== 'object') {
        errors.push({ message: `form "${formId}" requires "fields" object`, path: `/forms/${formId}/fields` });
        continue;
      }
      for (const [fieldId, field] of Object.entries(form.fields as Record<string, Record<string, unknown>>)) {
        if (!field.statePath || typeof field.statePath !== 'string') {
          errors.push({ message: `form "${formId}" field "${fieldId}" requires "statePath" string`, path: `/forms/${formId}/fields/${fieldId}/statePath` });
        }
        if (field.rules && Array.isArray(field.rules)) {
          for (let i = 0; i < (field.rules as unknown[]).length; i++) {
            const rule = (field.rules as Record<string, unknown>[])[i];
            if (rule.type && typeof rule.type === 'string' && !knownValidators.has(rule.type)) {
              const error: ValidationError = {
                message: `form "${formId}" field "${fieldId}": unknown validator type "${rule.type}"`,
                path: `/forms/${formId}/fields/${fieldId}/rules/${i}/type`,
              };
              if (doFixes) {
                const suggested = suggest(rule.type, Array.from(knownValidators));
                if (suggested) {
                  error.suggestedFixes = [{
                    patch: { op: 'replace', path: `/forms/${formId}/fields/${fieldId}/rules/${i}/type`, value: suggested },
                    confidence: 'high',
                    description: `validator '${rule.type}' → '${suggested}' (Levenshtein match)`,
                  }];
                }
              }
              errors.push(error);
            }
          }
        }
      }
    }
  }

  // Check for circular references
  function checkCircular(id: string, ancestors: Set<string>): void {
    if (ancestors.has(id)) {
      errors.push({ message: `Circular reference detected: element "${id}" references itself in its children chain`, elementId: id });
      return;
    }
    const el = elements[id] as Record<string, unknown> | undefined;
    if (el?.children && Array.isArray(el.children)) {
      const newAncestors = new Set(ancestors);
      newAncestors.add(id);
      for (const childId of el.children as string[]) {
        if (elements[childId]) {
          checkCircular(childId, newAncestors);
        }
      }
    }
  }
  if (elements[root]) {
    checkCircular(root, new Set());
  }

  // ── v49 Item E: derive + dataSources structural checks ──
  // (Cycle detection in derive is handled inline above; these add 7 additional checks.)

  const DEFAULT_PROTECTED_PATTERNS = ['/tx/*', '/ui/forms/*', '/auth/*'];

  function isUnderProtectedPattern(path: string): boolean {
    return DEFAULT_PROTECTED_PATTERNS.some((pattern) => {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -1); // e.g. "/auth/"
        if (path.startsWith(prefix)) return true;
        // Also match the bare prefix without trailing slash (e.g. "/auth")
        if (path === pattern.slice(0, -2)) return true;
        return false;
      }
      return path === pattern;
    });
  }

  function isUrlTemplateWellFormed(url: string): boolean {
    let i = 0;
    while (i < url.length) {
      const open = url.indexOf('${', i);
      if (open === -1) return true;
      const close = url.indexOf('}', open + 2);
      if (close === -1) return false; // unclosed
      if (close === open + 2) return false; // empty ${}
      i = close + 1;
    }
    return true;
  }

  function containsTemplatePattern(s: string): boolean {
    return /\$\{[^}]+\}/.test(s);
  }

  if (s.derive && typeof s.derive === 'object' && !Array.isArray(s.derive)) {
    const derive = s.derive as Record<string, unknown>;

    // Check 1: empty derive entries (undefined value)
    for (const [path, expr] of Object.entries(derive)) {
      if (expr === undefined) {
        errors.push({ message: `Derive path "${path}" has empty (undefined) expression` });
      }
    }

    // Check 3: derive path under default protected pattern
    for (const path of Object.keys(derive)) {
      if (isUnderProtectedPattern(path)) {
        errors.push({ message: `Derive path "${path}" is under a default protected pattern (/tx/*, /ui/forms/*, /auth/*) and cannot be used as a derive target` });
      }
    }
  }

  if (s.dataSources && typeof s.dataSources === 'object' && !Array.isArray(s.dataSources)) {
    const dataSources = s.dataSources as Record<string, { url?: unknown; target?: unknown }>;

    // Check 4: derive path conflicts with dataSources target
    if (s.derive && typeof s.derive === 'object') {
      const derivePaths = new Set(Object.keys(s.derive as Record<string, unknown>));
      for (const [id, ds] of Object.entries(dataSources)) {
        if (typeof ds.target === 'string' && derivePaths.has(ds.target)) {
          errors.push({ message: `Derive path "${ds.target}" conflicts with dataSources["${id}"].target — both want to write the same path` });
        }
      }
    }

    for (const [id, ds] of Object.entries(dataSources)) {
      // Check 5: object-form $template syntax
      if (ds.url && typeof ds.url === 'object' && !Array.isArray(ds.url)) {
        const urlObj = ds.url as Record<string, unknown>;
        if (typeof urlObj.$template === 'string' && !isUrlTemplateWellFormed(urlObj.$template)) {
          errors.push({ message: `dataSources["${id}"].url has malformed $template (unclosed \${ or empty \${}): "${urlObj.$template}"` });
        }
      }
      // Check 8 (NEW v49 Item E): plain-string URL containing ${...} — resolver does NOT substitute
      if (typeof ds.url === 'string' && containsTemplatePattern(ds.url)) {
        errors.push({ message: `dataSources["${id}"].url is a plain string containing \${...} which the resolver does NOT substitute. Wrap in $template: { $template: "${ds.url}" } to enable templating.` });
      }
      // Check 6: target validation
      if (typeof ds.target === 'string') {
        if (!ds.target.startsWith('/')) {
          errors.push({ message: `dataSources["${id}"].target must start with "/" — got "${ds.target}"` });
        }
        if (isUnderProtectedPattern(ds.target)) {
          errors.push({ message: `dataSources["${id}"].target "${ds.target}" is under a default protected pattern and cannot be used as a write target` });
        }
      }
    }
  }

  // Check 7: setState action targeting a derive path (read-only at runtime)
  if (s.derive && typeof s.derive === 'object') {
    const derivePaths = new Set(Object.keys(s.derive as Record<string, unknown>));
    function walkBindingsForSetState(obj: unknown): void {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) { obj.forEach(walkBindingsForSetState); return; }
      const o = obj as Record<string, unknown>;
      if (o.action === 'setState' && o.params && typeof o.params === 'object') {
        const path = (o.params as Record<string, unknown>).statePath;
        if (typeof path === 'string' && derivePaths.has(path)) {
          errors.push({ message: `setState action targets derive path "${path}" — derive paths are read-only at runtime` });
        }
      }
      for (const v of Object.values(o)) walkBindingsForSetState(v);
    }
    walkBindingsForSetState(s.elements);
    if (s.initialActions) walkBindingsForSetState(s.initialActions);
  }

  return { valid: errors.length === 0, errors, ...(warnings.length > 0 ? { warnings } : {}) };
}
