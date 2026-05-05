import { describe, it, expect } from 'vitest';
import { validateSpec } from '../../src/security/spec-validator.js';
import { PRIMITIVE_PROP_SCHEMAS } from '../../src/renderer/prop-schemas.js';

describe('Prop name validation', () => {
  const context = { propSchemas: PRIMITIVE_PROP_SCHEMAS };

  it('warns on unknown prop name', () => {
    const spec = {
      root: 'field',
      elements: {
        field: { type: 'input', props: { inputType: 'password', placeholder: 'Enter' } },
      },
    };

    const result = validateSpec(spec, context);

    expect(result.valid).toBe(true); // warnings don't affect validity
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBe(1);
    expect(result.warnings![0].message).toContain('unknown prop "inputType"');
    expect(result.warnings![0].message).toContain('input');
  });

  it('suggests close match via Levenshtein', () => {
    const spec = {
      root: 'field',
      elements: {
        field: { type: 'input', props: { typee: 'password' } },
      },
    };

    const result = validateSpec(spec, context);

    expect(result.warnings!.length).toBe(1);
    expect(result.warnings![0].suggestedFixes).toBeDefined();
    expect(result.warnings![0].suggestedFixes![0].description).toContain('type');
  });

  it('warns on typo prop name with suggestion', () => {
    const spec = {
      root: 'field',
      elements: {
        field: { type: 'input', props: { labl: 'Name' } },
      },
    };

    const result = validateSpec(spec, context);

    expect(result.warnings!.length).toBe(1);
    expect(result.warnings![0].message).toContain('unknown prop "labl"');
    expect(result.warnings![0].suggestedFixes![0].description).toContain('label');
  });

  it('does not warn on valid prop', () => {
    const spec = {
      root: 'field',
      elements: {
        field: { type: 'input', props: { label: 'Name', type: 'text', placeholder: 'Enter' } },
      },
    };

    const result = validateSpec(spec, context);

    expect(result.warnings ?? []).toEqual([]);
  });

  it('does not warn on common props (_tokens, bind, style)', () => {
    const spec = {
      root: 'field',
      elements: {
        field: { type: 'input', props: { _tokens: {}, bind: '/form/name', style: {} } },
      },
    };

    const result = validateSpec(spec, context);

    expect(result.warnings ?? []).toEqual([]);
  });

  it('does not warn when primitive has no schema defined', () => {
    const spec = {
      root: 'custom',
      elements: {
        custom: { type: 'my-custom-widget', props: { anything: 'goes' } },
      },
    };

    const result = validateSpec(spec, context);

    expect(result.warnings ?? []).toEqual([]);
  });

  it('warns on multiple unknown props', () => {
    const spec = {
      root: 'field',
      elements: {
        field: { type: 'input', props: { inputType: 'password', labl: 'Pass', plceholder: 'Enter' } },
      },
    };

    const result = validateSpec(spec, context);

    expect(result.warnings!.length).toBe(3);
  });

  it('does not warn when propSchemas not in context', () => {
    const spec = {
      root: 'field',
      elements: {
        field: { type: 'input', props: { inputType: 'password' } },
      },
    };

    const result = validateSpec(spec, {});

    expect(result.warnings ?? []).toEqual([]);
  });

  it('unknown prop without close match has no suggestedFixes', () => {
    const spec = {
      root: 'field',
      elements: {
        field: { type: 'input', props: { xyzAbc123: 'value' } },
      },
    };

    const result = validateSpec(spec, context);

    expect(result.warnings!.length).toBe(1);
    expect(result.warnings![0].message).toContain('unknown prop "xyzAbc123"');
    expect(result.warnings![0].suggestedFixes).toBeUndefined();
  });
});

describe('Spec-level unknown property warnings', () => {
  it('warns on typo with Levenshtein suggestion', () => {
    const spec = {
      root: 'page',
      elements: { page: { type: 'box', props: {} } },
      dervie: { '/total': { $state: '/count' } },
    };

    const result = validateSpec(spec);

    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBe(1);
    expect(result.warnings![0].message).toContain('Unknown top-level property "dervie"');
    expect(result.warnings![0].suggestedFixes).toBeDefined();
    expect(result.warnings![0].suggestedFixes![0].description).toContain('derive');
  });

  it('warns on unknown key without close match', () => {
    const spec = {
      root: 'page',
      elements: { page: { type: 'box', props: {} } },
      xyzFoo: 'bar',
    };

    const result = validateSpec(spec);

    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBe(1);
    expect(result.warnings![0].message).toContain('Unknown top-level property "xyzFoo"');
    expect(result.warnings![0].suggestedFixes).toBeUndefined();
  });

  it('warns on singular typo with suggestion', () => {
    const spec = {
      root: 'page',
      elements: { page: { type: 'box', props: {} } },
      template: {},
    };

    const result = validateSpec(spec);

    expect(result.warnings!.length).toBe(1);
    expect(result.warnings![0].suggestedFixes![0].description).toContain('templates');
  });

  it('warns on multiple unknown keys', () => {
    const spec = {
      root: 'page',
      elements: { page: { type: 'box', props: {} } },
      dervie: {},
      templets: {},
    };

    const result = validateSpec(spec);

    expect(result.warnings!.length).toBe(2);
  });

  it('no warnings on valid spec with all known keys', () => {
    const spec = {
      root: 'page',
      elements: { page: { type: 'box', props: {} } },
      initialActions: [],
      globalStyles: '',
      derive: {},
      dataSources: {},
      templates: {},
      forms: {},
    };

    const result = validateSpec(spec);

    expect(result.warnings ?? []).toEqual([]);
  });
});

describe('Table column prop validation', () => {
  const context = { propSchemas: PRIMITIVE_PROP_SCHEMAS };

  it('warns on unknown column prop with suggestion', () => {
    const spec = {
      root: 'tbl',
      elements: {
        tbl: {
          type: 'table',
          props: {
            data: [],
            columns: [{ label: 'Name', sort_able: true }],
          },
        },
      },
    };

    const result = validateSpec(spec, context);

    expect(result.valid).toBe(true);
    const colWarnings = (result.warnings ?? []).filter(w => w.message.includes('column prop'));
    expect(colWarnings.length).toBe(1);
    expect(colWarnings[0].message).toContain('unknown column prop "sort_able"');
    expect(colWarnings[0].suggestedFixes).toBeDefined();
    expect(colWarnings[0].suggestedFixes![0].description).toContain('sortable');
  });

  it('no warnings on valid column props', () => {
    const spec = {
      root: 'tbl',
      elements: {
        tbl: {
          type: 'table',
          props: {
            data: [],
            columns: [{ id: 'name', label: 'Name', sortable: true, width: '200px', align: 'left' }],
          },
        },
      },
    };

    const result = validateSpec(spec, context);

    const colWarnings = (result.warnings ?? []).filter(w => w.message.includes('column prop'));
    expect(colWarnings).toEqual([]);
  });

  it('warns on correct column index', () => {
    const spec = {
      root: 'tbl',
      elements: {
        tbl: {
          type: 'table',
          props: {
            data: [],
            columns: [
              { label: 'OK' },
              { label: 'Bad', colour: 'red' },
              { label: 'Also OK' },
            ],
          },
        },
      },
    };

    const result = validateSpec(spec, context);

    const colWarnings = (result.warnings ?? []).filter(w => w.message.includes('column prop'));
    expect(colWarnings.length).toBe(1);
    expect(colWarnings[0].message).toContain('columns[1]');
  });

  it('skips column validation when columns is not an array', () => {
    const spec = {
      root: 'tbl',
      elements: {
        tbl: {
          type: 'table',
          props: { data: [], columns: 'not-an-array' },
        },
      },
    };

    const result = validateSpec(spec, context);

    const colWarnings = (result.warnings ?? []).filter(w => w.message.includes('column prop'));
    expect(colWarnings).toEqual([]);
  });

  it('skips columns that are expressions', () => {
    const spec = {
      root: 'tbl',
      elements: {
        tbl: {
          type: 'table',
          props: {
            data: [],
            columns: { $state: '/config/columns' },
          },
        },
      },
    };

    const result = validateSpec(spec, context);

    const colWarnings = (result.warnings ?? []).filter(w => w.message.includes('column prop'));
    expect(colWarnings).toEqual([]);
  });
});

describe('Spatial map prop validation', () => {
  const context = { propSchemas: PRIMITIVE_PROP_SCHEMAS };

  it('does not warn on spatial-map runtime props', () => {
    const spec = {
      root: 'map',
      elements: {
        map: {
          type: 'spatial-map',
          props: {
            viewBox: { x: 0, y: 0, width: 1000, height: 600 },
            mode: 'operate',
            zones: [],
            items: [],
            layers: ['zones', 'items', 'labels'],
            statusStyles: {},
            selectedItemPath: '/ui/selectedSpatialItem',
            selectedItemId: 'item-1',
            selectedZonePath: '/ui/selectedSpatialZone',
            selectedZoneId: 'zone-1',
            zoneShapeEditId: 'zone-1',
            canvasPressPath: '/ui/floorEditor/canvasPress',
            interactionPolicy: {
              selectItems: true,
              activateItems: true,
              selectZones: true,
              activateZones: true,
              zonePressStopsCanvas: true,
            },
            editPolicy: {
              dragItems: true,
              dragZones: true,
              keyboardMoveItems: true,
              keyboardMoveZones: true,
              bounds: 'viewBox',
              boundsMode: 'position',
              keyboardStep: 1,
              keyboardLargeStep: 10,
              coordinatePrecision: 0,
              snap: {
                enabled: true,
                grid: { enabled: true, size: 20, threshold: 8 },
                itemCenters: { enabled: true, threshold: 8 },
              },
              guides: {
                enabled: true,
                showCoordinates: true,
                showSnapLines: true,
              },
            },
            canvasGuide: { visible: true, kind: 'crosshair' },
            itemChangePath: '/ui/floorEditor/itemChange',
            zoneChangePath: '/ui/floorEditor/zoneChange',
            onItemPress: { action: 'noop' },
            onItemChange: { action: 'setState', params: { statePath: '/data/layout/items', value: [] } },
            onZonePress: { action: 'noop' },
            onZoneChange: { action: 'setState', params: { statePath: '/data/layout/zones', value: [] } },
            onZoneShapeEditExit: { action: 'setState', params: { statePath: '/ui/zoneShapeEditId', value: null } },
            onCanvasPress: { action: 'noop' },
            ariaLabel: 'Floor plan',
          },
        },
      },
    };

    const result = validateSpec(spec, context);

    expect(result.warnings ?? []).toEqual([]);
  });

  it('warns on unknown spatial-map prop with suggestion', () => {
    const spec = {
      root: 'map',
      elements: {
        map: {
          type: 'spatial-map',
          props: {
            viewBox: { x: 0, y: 0, width: 1000, height: 600 },
            itemz: [],
          },
        },
      },
    };

    const result = validateSpec(spec, context);
    const warnings = result.warnings ?? [];

    expect(warnings.length).toBe(1);
    expect(warnings[0].message).toContain('unknown prop "itemz"');
    expect(warnings[0].suggestedFixes?.[0].description).toContain('items');
  });
});
