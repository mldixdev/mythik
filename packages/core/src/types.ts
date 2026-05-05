import type { ElementAnimations } from './design/animation/types.js';

// --- DataSource ---

export interface DataSourceConfig {
  /**
   * Request URL — literal string OR expression object.
   *
   * Plain strings are LITERAL — `${...}` is NOT substituted. To templatize a URL with state,
   * use the explicit expression form: `{ $template: '/api/users/${/auth/userId}/posts' }`
   * or `{ $state: '/some/url' }`. The validator (v49 Item E) flags plain strings containing
   * `${...}` as a load-time error to prevent silent template-resolution bugs.
   */
  url: unknown;
  /** HTTP method. Default: GET. */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Request headers — typically { $state: "/config/headers" }. */
  headers?: unknown;
  /** Reactive parameters. Changes trigger re-fetch when trigger is "auto". */
  params?: Record<string, unknown>;
  /** State path where response data is written. */
  target: string;
  /** "auto": re-fetch when params change. "manual": only via refreshDataSource action. Default: "auto". */
  trigger?: 'auto' | 'manual';
  /** Debounce time in ms for auto-trigger. Default: 0. */
  debounce?: number;
  /** Fetch on spec mount. Default: true. */
  initialFetch?: boolean;
  /** If true, clear target while loading. If false, keep previous data. Default: false. */
  emptyWhileLoading?: boolean;
}

// --- Element Templates ---

export interface TemplateDefinition {
  /** Primitive type this template wraps (e.g., "text", "box"). */
  type: string;
  /** Default prop values — used when the consuming element doesn't provide a prop. */
  defaults?: Record<string, unknown>;
  /** Props passed to the underlying primitive. Can use $prop to reference element-provided values. */
  props?: Record<string, unknown>;
  /** Style object. Can use $prop. */
  style?: Record<string, unknown>;
  /**
   * Animations at the template cascade level (plan 3 Task 13).
   *
   * Field-typed as `Record<string, unknown>` at this layer so the spec-
   * engine can traverse/interpolate `$prop.X` references before the
   * renderer merges the resulting shape into the cascade. After
   * interpolation the runtime shape IS an ElementAnimations per the
   * animation engine contract (mount/unmount/hover/focus/active/ambient/
   * stateChange keys). See mergeElementAnimations and useElementAnimations
   * for downstream consumption.
   *
   * A whole-field `null` value at this level is valid (cascade-neutral —
   * level contributes nothing); per-trigger `null` disables an inherited
   * trigger per the cascade null-semantics decision table.
   */
  animations?: Record<string, unknown> | null;
  /** Child element IDs. Use "$children" to inject the consuming element's children. */
  children?: string[];
  /** All other Element fields supported (visible, hover, etc.) */
  [key: string]: unknown;
}

// --- Spec (flat tree) ---

export type EditorSessionValidatorConfig =
  | { type: 'pathExists'; path: string }
  | { type: 'jsonSerializable'; path: string }
  | { type: 'arrayUniqueField'; path: string; field: string }
  | { type: 'arrayObjects'; path: string };

export type EditorSessionPersistenceMethod = 'POST' | 'PUT' | 'PATCH';
export type EditorSessionPersistenceBody = 'trackedPaths' | 'snapshot' | Record<string, unknown>;

export interface EditorSessionPersistenceConfig {
  url: string | Record<string, unknown>;
  method?: EditorSessionPersistenceMethod;
  headers?: Record<string, unknown>;
  body?: EditorSessionPersistenceBody;
  target?: string;
  timeout?: number;
}

export interface EditorSessionConfig {
  paths: string[];
  maxHistory?: number;
  label?: string;
  validators?: EditorSessionValidatorConfig[];
  persistence?: EditorSessionPersistenceConfig;
}

export interface Spec {
  root: string;
  elements: Record<string, Element>;
  initialActions?: (ActionBinding | TransactionBinding)[];
  globalStyles?: string;
  /** Derived state: paths auto-computed from expressions. Read-only for setState. */
  derive?: Record<string, unknown>;
  /** Declarative data sources — reactive data fetching. */
  dataSources?: Record<string, DataSourceConfig>;
  /** Reusable element templates defined inline in the spec. */
  templates?: Record<string, TemplateDefinition>;
  /** Declarative form validation configuration. */
  forms?: Record<string, import('./forms/types.js').FormConfig>;
  /** Declarative editor sessions for transactional JSON document editing. */
  editorSessions?: Record<string, EditorSessionConfig>;
  /**
   * Design tokens attached to the spec payload (plan 3 Task 20). Read by the
   * renderer for root-level LayerBackground mount + palette extraction.
   * Runtime-attached by consumers — shape is the resolved token tree
   * (colors, identity, typography, elevation, etc.). Typed loosely to avoid
   * forcing every Spec consumer into the full design-tokens type graph.
   */
  tokens?: Record<string, unknown>;
}

/** Valid top-level spec keys. Source of truth — used by validator to warn on unknowns. */
export const SPEC_KEYS = [
  'root', 'elements', 'initialActions', 'globalStyles',
  'derive', 'dataSources', 'templates', 'forms', 'editorSessions', 'tokens',
] as const;

// Compile-time guard: adding a key to Spec without updating SPEC_KEYS causes a type error here.
type _AssertSpecKeys = Exclude<keyof Spec, (typeof SPEC_KEYS)[number]>;
type _SpecKeysComplete = [_AssertSpecKeys] extends [never] ? true : _AssertSpecKeys;
const _checkSpecKeys: _SpecKeysComplete = true;
void _checkSpecKeys;

export interface Element {
  type: string;
  props?: Record<string, unknown>;
  children?: string[];
  style?: Record<string, unknown>;
  visible?: Expression | boolean;
  permission?: PermissionConfig;
  repeat?: RepeatConfig;
  watch?: Record<string, ActionBinding[]>;
  on?: Record<string, EventBinding>;
  a11y?: A11yConfig;
  // Interactive states — resolved by engine, applied by renderer via Motion
  hover?: Record<string, unknown>;
  active?: Record<string, unknown>;
  focus?: Record<string, unknown>;
  transition?: TransitionConfig;
  // Mount/enter/exit animations (legacy Framer-Motion-style — coexists with `animations`; migration deferred to plan 3)
  motion?: MotionAnimationConfig;
  // New Animation Engine per-element config (plan 2). Per-trigger null disables inherited
  // cascade entry (cascade composition lands in plan 3). Whole-field null disables all.
  animations?: ElementAnimations | null;
  // Dynamic key — forces remount when value changes (supports expressions)
  key?: unknown;
  // Opt-out of auto-skeleton for this element
  skeleton?: false;
}

// --- Expressions ---

export type Expression =
  | StateExpression
  | CondExpression
  | TemplateExpression
  | ComputedExpression
  | LetExpression
  | RefExpression
  | TokenExpression
  | ItemExpression
  | IndexExpression
  | BreakpointExpression
  | I18nExpression
  | BindStateExpression
  | BindItemExpression
  | SourceExpression
  | PropExpression
  | SwitchExpression
  | MathExpression
  | ArrayExpression
  | DateExpression
  | FormatExpression
  | AndExpression
  | OrExpression
  | NotExpression
  | AuthExpression
  | GroupExpression
  | SelectionExpression
  | UniqueIdExpression
  | LiteralValue;

export type LiteralValue = string | number | boolean | null;

export interface StateExpression {
  $state: string;
}

export interface CondExpression {
  $cond: Expression;
  $then: Expression;
  $else: Expression;
}

export interface TemplateExpression {
  $template: string;
}

export interface ComputedExpression {
  $computed: string;
  args?: Record<string, Expression>;
}

export interface LetExpression {
  $let: Record<string, Expression>;
  $in: Expression;
}

export interface RefExpression {
  $ref: string;
}

export interface TokenExpression {
  $token: string;
  multiply?: number;
}

export interface ItemExpression {
  $item: string;
}

export interface IndexExpression {
  $index: true;
}

export interface BreakpointExpression {
  $breakpoint: Record<string, unknown>;
}

export interface I18nExpression {
  $i18n: string;
  args?: Record<string, Expression>;
}

export interface BindStateExpression {
  $bindState: string;
}

export interface BindItemExpression {
  $bindItem: string;
}

export interface SourceExpression {
  $source: {
    provider: string;
    table?: string;
    url?: string;
    query?: Record<string, Expression>;
    target: string;
  };
  default?: unknown;
}

export interface PropExpression {
  $prop: string;
}

export interface SwitchExpression {
  $switch: Expression;
  cases: Record<string, Expression>;
  default: Expression;
}

// --- $array where clause (shared) ---

export interface ArrayWhereClause {
  field: string;
  eq?: Expression;
  neq?: Expression;
  gt?: Expression;
  gte?: Expression;
  lt?: Expression;
  lte?: Expression;
  in?: Expression;
  notIn?: Expression;
}

// --- $math ---

export interface MathExpression {
  $math: string;
  args?: Expression[];
  value?: Expression;
  decimals?: number;
}

// --- $array ---

export interface ArrayExpression {
  $array: string;
  source: Expression;
  where?: ArrayWhereClause;
  field?: string;
  field1?: string;
  field2?: string;
  value?: Expression;
  query?: Expression;
  fields?: string[];
  from?: Expression;
  to?: Expression;
  direction?: 'asc' | 'desc';
}

// --- $date ---

export interface DateExpression {
  $date: string;
  from?: Expression;
  to?: Expression;
  value?: Expression;
  unit?: string;
  pattern?: string;
  amount?: number;
}

// --- $format ---

export interface FormatExpression {
  $format: string;
  value: Expression;
  currency?: Expression;
  locale?: Expression;
  decimals?: number;
  notation?: string;
  signDisplay?: string;
  useGrouping?: boolean;
  length?: number;
}

// --- $and / $or / $not ---

export interface AndExpression {
  $and: Expression[];
}

export interface OrExpression {
  $or: Expression[];
}

export interface NotExpression {
  $not: Expression;
}

// --- $auth ---

export interface AuthExpression {
  $auth: string;
}

// --- $group ---

export interface GroupExpression {
  $group: string;
  field?: string;
}

// --- $selection ---

export interface SelectionExpression {
  $selection: string;
}

export interface UniqueIdExpression {
  $uniqueId: boolean;
  source: Expression;
  field?: string;
  prefix?: Expression;
  start?: Expression;
  padding?: Expression;
}

// --- Visibility conditions ---

export interface ComparisonCondition {
  $state?: string;
  $item?: string;
  $index?: true;
  $computed?: string;
  $ref?: string;
  eq?: Expression;
  neq?: Expression;
  gt?: Expression;
  gte?: Expression;
  lt?: Expression;
  lte?: Expression;
  not?: boolean;
  args?: Record<string, Expression>;
}

export interface AndCondition {
  $and: Array<ComparisonCondition | OrCondition>;
}

export interface OrCondition {
  $or: Array<ComparisonCondition | AndCondition>;
}

export type VisibilityCondition =
  | ComparisonCondition
  | AndCondition
  | OrCondition
  | Array<ComparisonCondition>;

// --- Actions ---

export interface ActionBinding {
  action: string;
  params?: Record<string, Expression>;
  /** When true, dispatch without awaiting — fire and continue to next action immediately. */
  fireAndForget?: boolean;
}

export interface TransactionConfig {
  before?: ActionBinding[];
  optimistic?: ActionBinding[];
  confirm: ActionBinding[];
  onSuccess?: ActionBinding[];
  onError?: ActionBinding[];
  /** Timeout in ms for confirm phase. Default: 10000 */
  timeout?: number;
}

export interface TransactionBinding {
  transaction: TransactionConfig;
}

/** Union type for all event binding shapes */
export type EventBinding = ActionBinding | ActionBinding[] | TransactionBinding;

// --- Repeat ---

export interface RepeatConfig {
  statePath?: string;
  source?: unknown; // Expression that resolves to an array (e.g., $array: 'slice')
  count?: Expression;
  key?: string;
  // --- GroupBy (client-side) ---
  /** Field name to group by. Enables client-side grouping. */
  groupBy?: string;
  // --- GroupBy (pre-grouped) ---
  /** Field in each group object that contains the group key. Enables pre-grouped mode. */
  groupKey?: string;
  /** Field in each group object that contains the array of items. */
  groupItems?: string;
  // --- Group rendering ---
  /** Element IDs to render as group header (receives $group context). */
  groupHeader?: string[];
  /** Element IDs to render as group footer (receives $group context). */
  groupFooter?: string[];
  /** Element IDs to render once after all groups (receives normal state context). */
  footer?: string[];
  /** Selection config for multi-select. Enables $selection expressions. */
  selection?: {
    state: string;
    key: string;
    mode: 'single' | 'multiple';
  };
}

// --- Motion & Interactions ---

export interface TransitionConfig {
  duration?: unknown; // number or Expression ($token)
  ease?: unknown; // string, array, or Expression
  delay?: unknown; // number or Expression
  type?: string; // 'spring' | 'tween' | 'inertia'
  stiffness?: number;
  damping?: number;
  staggerChildren?: number;
}

export interface MotionAnimationConfig {
  initial?: Record<string, unknown>;
  animate?: Record<string, unknown>;
  /** Shared layout animation ID — elements with the same layoutId animate between positions. */
  layoutId?: string;
  exit?: Record<string, unknown>;
  transition?: TransitionConfig;
}

// Legacy motion types (used by motion engine, not connected to renderer yet)

export interface MotionConfig {
  sequence?: MotionStep[];
  animation?: string;
  duration?: Expression;
  delay?: number;
  stagger?: number;
  path?: string;
}

export interface MotionStep {
  target: string;
  animation: string;
  duration: Expression;
  delay?: number;
  stagger?: number;
}

// --- Permission ---

export interface PermissionConfig {
  visible?: string[];
  editable?: string[];
  readonly?: string[];
}

// --- A11y ---

export interface A11yConfig {
  label?: string;
  role?: string;
  hint?: string;
}

// --- Plugin system ---

export interface PrimitiveDefinition {
  type: string;
  component: unknown;
}

export interface ActionDefinition {
  name: string;
  handler: (params: Record<string, unknown>, setState: StateSetFn, getState: StateGetFn) => unknown | Promise<unknown>;
}

export interface ValidatorDefinition {
  name: string;
  validate: (value: unknown, args?: Record<string, unknown>) => boolean | Promise<boolean>;
  message?: string;
}

export interface ExpressionHandlerDefinition {
  key: string;
  resolve: (expr: Record<string, unknown>, context: ResolverContext, resolveFn?: ResolveFn) => unknown;
}

export interface SourceProviderDefinition {
  name: string;
  fetch: (config: Record<string, unknown>) => unknown | Promise<unknown>;
}

export type PluginType = 'primitive' | 'action' | 'validator' | 'expression' | 'source';

// --- State ---

export type StateGetFn = (path: string) => unknown;
export type StateSetFn = (path: string, value: unknown) => void;
export type ResolveFn = (expr: unknown, context?: ResolverContext) => unknown;

// --- Resolver context ---

export interface ResolverContext {
  getState: StateGetFn;
  setState: StateSetFn;
  item?: unknown;
  index?: number;
  props?: Record<string, unknown>;
  letBindings?: Record<string, unknown>;
  tokens?: Record<string, unknown>;
  locale?: string;
  translations?: Record<string, Record<string, string>>;
  computedFunctions?: Record<string, (args: Record<string, unknown>) => unknown>;
  /** Group context for $group expressions inside repeat.groupBy */
  group?: { key: unknown; items: unknown[]; index: number; raw?: unknown };
  /** Selection context for $selection expressions inside repeat.selection */
  selection?: { state: string; key: string; mode: 'single' | 'multiple' };
}

// --- Renderer ---

export interface RenderNode {
  type: string;
  props: Record<string, unknown>;
  children: RenderNode[];
  key?: string;
}
