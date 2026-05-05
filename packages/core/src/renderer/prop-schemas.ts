/**
 * Per-primitive metadata: valid prop names + optional lazy action paths.
 * - `validProps`: used by spec-validator to warn on unknown prop names (typos).
 * - `lazyActionPaths`: paths within props whose subtrees hold action-bindings.
 *   Engine keeps these raw at render; dispatcher resolves inner $state /
 *   $template at press time. See packages/core/src/renderer/lazy-paths.ts.
 */
export interface PrimitiveSchema {
  validProps: string[];
  lazyActionPaths?: string[];
}

export const PRIMITIVE_PROP_SCHEMAS: Record<string, PrimitiveSchema> = {
  box: { validProps: ['style', 'className'] },
  text: { validProps: ['content', 'variant', 'style', 'className'] },
  image: { validProps: ['src', 'alt', 'aspectRatio', 'placeholder', 'style'] },
  icon: { validProps: ['name', 'size', 'weight', 'color', 'style'] },
  stack: { validProps: ['direction', 'gap', 'align', 'justify', 'style', 'className'] },
  grid: { validProps: ['columns', 'rows', 'gap', 'areas', 'style', 'className'] },
  scroll: { validProps: ['direction', 'maxHeight', 'style', 'className'] },
  divider: { validProps: ['direction', 'style'] },
  spacer: { validProps: ['size', 'direction', 'style'] },
  input: { validProps: ['value', 'type', 'placeholder', 'label', 'disabled', 'readOnly', 'required', 'format', 'formatOptions', 'selectOnFocus', 'checks', 'validateOn', 'style', 'onChange'] },
  textarea: { validProps: ['value', 'placeholder', 'label', 'rows', 'disabled', 'readOnly', 'style', 'onChange'] },
  select: { validProps: ['value', 'options', 'placeholder', 'label', 'disabled', 'required', 'style', 'onChange'] },
  checkbox: { validProps: ['checked', 'label', 'disabled', 'style', 'onChange'] },
  toggle: { validProps: ['checked', 'label', 'disabled', 'style', 'onChange'] },
  slider: { validProps: ['value', 'min', 'max', 'step', 'label', 'disabled', 'style', 'onChange'] },
  button: { validProps: ['label', 'variant', 'disabled', 'style', 'className', 'onClick'] },
  touchable: { validProps: ['style', 'className', 'onClick'] },
  list: { validProps: ['style'] },
  modal: { validProps: ['visible', 'title', 'style', 'onClose'] },
  drawer: { validProps: ['visible', 'side', 'width', 'style', 'onClose'] },
  tabs: { validProps: ['value', 'items', 'style', 'onChange'] },
  accordion: { validProps: ['title', 'defaultOpen', 'badge', 'style'] },
  wizard: { validProps: ['currentStep', 'totalSteps', 'style'] },
  screen: { validProps: ['title', 'style'] },
  'bar-chart': { validProps: ['data', 'height', 'style'] },
  'line-chart': { validProps: ['data', 'height', 'color', 'style'] },
  'pie-chart': { validProps: ['data', 'size', 'donut', 'style'] },
  'area-chart': { validProps: ['data', 'height', 'color', 'style'] },
  'spatial-map': {
    validProps: [
      'viewBox',
      'layers',
      'zones',
      'items',
      'mode',
      'statusStyles',
      'selectedItemPath',
      'selectedItemId',
      'selectedZonePath',
      'selectedZoneId',
      'zoneShapeEditId',
      'canvasPressPath',
      'interactionPolicy',
      'editPolicy',
      'canvasGuide',
      'itemChangePath',
      'zoneChangePath',
      'ariaLabel',
      'style',
      'className',
      'onItemPress',
      'onItemChange',
      'onZonePress',
      'onZoneChange',
      'onZoneShapeEditExit',
      'onCanvasPress',
    ],
    lazyActionPaths: ['onItemPress', 'onItemChange', 'onZonePress', 'onZoneChange', 'onZoneShapeEditExit', 'onCanvasPress'],
  },
  table: {
    validProps: ['data', 'columns', 'style', 'className', 'sorting', 'pagination', 'selection', 'groupBy', 'stickyHeader', 'emptyState', 'rowStyle', 'onRowClick', 'onStateChange', 'dispatchAction', 'renderIcon', 'headerStyle', 'groupHeaderStyle', 'groupHeaderRender', 'subtotalStyle', 'grandTotalStyle', 'grandTotal', 'cellStyle'],
    lazyActionPaths: ['columns[].actions[].onPress', 'onRowClick'],
  },
  'kanban-board': { validProps: ['columns', 'style'] },
  'file-upload': { validProps: ['accept', 'multiple', 'maxSize', 'maxFiles', 'preview', 'dropZone', 'autoUpload', 'label', 'disabled', 'style', 'uploadState', 'onFiles', 'onRemove', 'onRetry'] },
  camera: { validProps: ['label', 'accept', 'disabled', 'style', 'onCapture'] },
  signature: { validProps: ['width', 'height', 'lineColor', 'lineWidth', 'label', 'style', 'onSign'] },
  'audio-player': { validProps: ['src', 'label', 'style'] },
  'screen-outlet': { validProps: ['style'] },
  'toast-container': { validProps: ['store', 'onDismiss', 'position', 'duration', 'maxVisible', 'offset', 'gap', 'renderIcon'] },
  skeleton: { validProps: ['variant', 'width', 'height', 'count', 'gap', 'style'] },
};

/** Props valid on any element — never flagged as unknown. */
export const COMMON_PROPS = new Set(['style', 'className', '_tokens', '_component', '_motion', 'bind', 'variant']);

/** Valid prop names for table column objects. Source of truth — type guard in react/table.tsx. */
export const TABLE_COLUMN_PROPS = [
  'id', 'label', 'width', 'align', 'format', 'formatOptions',
  'sortable', 'visible', 'style', 'actions', 'field', 'key',
] as const;
