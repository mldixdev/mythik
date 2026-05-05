import { describe, it, expect } from 'vitest';
import { createFormEngine } from '../../src/forms/engine.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import type { FormConfig } from '../../src/forms/types.js';

function setup(initialState: Record<string, unknown>, forms: Record<string, FormConfig>) {
  const store = createStateStore(initialState);
  const resolver = createResolver({ store });
  const engine = createFormEngine({ store, resolve: (expr) => resolver.resolve(expr), forms });
  return { store, engine };
}

describe('FormEngine', () => {
  it('captures initial values on mount', () => {
    const { store } = setup(
      { form: { title: 'Hello', email: '' } },
      { 'task-form': { fields: {
        title: { statePath: '/form/title', rules: [] },
        email: { statePath: '/form/email', rules: [] },
      }}}
    );
    expect(store.get('/ui/forms/task-form/isValid')).toBe(true);
    expect(store.get('/ui/forms/task-form/errorCount')).toBe(0);
  });

  it('runs initial silent validation — isValid reflects actual state', () => {
    const { store } = setup(
      { form: { title: '' } },
      { 'task-form': { fields: {
        title: { statePath: '/form/title', rules: [{ type: 'required', message: 'Required' }] },
      }}}
    );
    expect(store.get('/ui/forms/task-form/isValid')).toBe(false);
    expect(store.get('/ui/forms/task-form/fields/title/touched')).toBe(false);
    expect(store.get('/ui/forms/task-form/fields/title/errors')).toEqual([]);
  });

  it('does not show errors for untouched fields on change', () => {
    const { store } = setup(
      { form: { title: '' } },
      { 'task-form': { fields: {
        title: { statePath: '/form/title', rules: [{ type: 'required', message: 'Required' }] },
      }}}
    );
    store.set('/form/title', 'x');
    store.set('/form/title', '');
    expect(store.get('/ui/forms/task-form/fields/title/errors')).toEqual([]);
  });

  it('validates field when touched and value changes', () => {
    const { store, engine } = setup(
      { form: { title: '' } },
      { 'task-form': { fields: {
        title: { statePath: '/form/title', rules: [{ type: 'required', message: 'Required' }] },
      }}}
    );
    engine.touchField('task-form', 'title');
    expect(store.get('/ui/forms/task-form/fields/title/touched')).toBe(true);
    expect(store.get('/ui/forms/task-form/fields/title/errors')).toEqual(['Required']);

    store.set('/form/title', 'Hello');
    expect(store.get('/ui/forms/task-form/fields/title/errors')).toEqual([]);
    expect(store.get('/ui/forms/task-form/isValid')).toBe(true);
  });

  it('tracks dirty state', () => {
    const { store } = setup(
      { form: { title: 'Original' } },
      { 'task-form': { fields: {
        title: { statePath: '/form/title', rules: [] },
      }}}
    );
    expect(store.get('/ui/forms/task-form/fields/title/dirty')).toBe(false);
    expect(store.get('/ui/forms/task-form/isDirty')).toBe(false);

    store.set('/form/title', 'Changed');
    expect(store.get('/ui/forms/task-form/fields/title/dirty')).toBe(true);
    expect(store.get('/ui/forms/task-form/isDirty')).toBe(true);

    store.set('/form/title', 'Original');
    expect(store.get('/ui/forms/task-form/fields/title/dirty')).toBe(false);
    expect(store.get('/ui/forms/task-form/isDirty')).toBe(false);
  });

  it('validateForm marks all fields touched and validates all', () => {
    const { store, engine } = setup(
      { form: { title: '', email: 'bad' } },
      { 'task-form': { fields: {
        title: { statePath: '/form/title', rules: [{ type: 'required', message: 'Title required' }] },
        email: { statePath: '/form/email', rules: [{ type: 'email', message: 'Invalid email' }] },
      }}}
    );
    const result = engine.validateForm('task-form');
    expect(result).toBe(false);
    expect(store.get('/ui/forms/task-form/fields/title/touched')).toBe(true);
    expect(store.get('/ui/forms/task-form/fields/title/errors')).toEqual(['Title required']);
    expect(store.get('/ui/forms/task-form/fields/email/touched')).toBe(true);
    expect(store.get('/ui/forms/task-form/fields/email/errors')).toEqual(['Invalid email']);
    expect(store.get('/ui/forms/task-form/isValid')).toBe(false);
    expect(store.get('/ui/forms/task-form/errorCount')).toBe(2);
  });

  it('cross-field validation re-validates when dependency changes', () => {
    const { store, engine } = setup(
      { form: { minPrice: 100, maxPrice: 50 } },
      { 'price-form': { fields: {
        minPrice: { statePath: '/form/minPrice', rules: [] },
        maxPrice: { statePath: '/form/maxPrice', rules: [
          { type: 'greaterThan', args: { other: { $state: '/form/minPrice' } }, message: 'Max must exceed min' },
        ]},
      }}}
    );
    engine.touchField('price-form', 'maxPrice');
    expect(store.get('/ui/forms/price-form/fields/maxPrice/errors')).toEqual(['Max must exceed min']);

    // Fix by lowering min below max
    store.set('/form/minPrice', 10);
    expect(store.get('/ui/forms/price-form/fields/maxPrice/errors')).toEqual([]);
    expect(store.get('/ui/forms/price-form/isValid')).toBe(true);
  });

  it('resetForm restores initial values and clears state', () => {
    const { store, engine } = setup(
      { form: { title: 'Original', email: '' } },
      { 'task-form': { fields: {
        title: { statePath: '/form/title', rules: [{ type: 'required' }] },
        email: { statePath: '/form/email', rules: [] },
      }}}
    );
    store.set('/form/title', 'Changed');
    engine.touchField('task-form', 'title');
    engine.resetForm('task-form');

    expect(store.get('/form/title')).toBe('Original');
    expect(store.get('/form/email')).toBe('');
    expect(store.get('/ui/forms/task-form/fields/title/touched')).toBe(false);
    expect(store.get('/ui/forms/task-form/fields/title/dirty')).toBe(false);
    expect(store.get('/ui/forms/task-form/fields/title/errors')).toEqual([]);
    expect(store.get('/ui/forms/task-form/isValid')).toBe(true);
    expect(store.get('/ui/forms/task-form/errorCount')).toBe(0);
  });

  it('multiple forms work independently', () => {
    const { store, engine } = setup(
      { formA: { name: '' }, formB: { code: '' } },
      {
        'form-a': { fields: { name: { statePath: '/formA/name', rules: [{ type: 'required', message: 'Name required' }] } } },
        'form-b': { fields: { code: { statePath: '/formB/code', rules: [{ type: 'required', message: 'Code required' }] } } },
      }
    );
    engine.validateForm('form-a');
    expect(store.get('/ui/forms/form-a/isValid')).toBe(false);
    expect(store.get('/ui/forms/form-b/fields/code/touched')).toBe(false);
  });

  it('cleanup unsubscribes all listeners', () => {
    const { store, engine } = setup(
      { form: { title: '' } },
      { 'task-form': { fields: {
        title: { statePath: '/form/title', rules: [{ type: 'required', message: 'Required' }] },
      }}}
    );
    engine.touchField('task-form', 'title');
    expect(store.get('/ui/forms/task-form/fields/title/errors')).toEqual(['Required']);

    engine.destroy();
    store.set('/form/title', 'After destroy');
    // Should not clear errors after destroy — subscriptions removed
    expect(store.get('/ui/forms/task-form/fields/title/errors')).toEqual(['Required']);
  });
});
