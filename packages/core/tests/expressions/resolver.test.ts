import { describe, it, expect } from 'vitest';
import { createResolver } from '../../src/expressions/resolver.js';
import { createStateStore } from '../../src/state/store.js';

describe('Expression Resolver (integrated)', () => {
  const store = createStateStore({
    user: { name: 'Alice', role: 'admin', age: 30 },
    form: { isValid: true },
    patient: { weight: 80, height: 1.75 },
    service: { id: 7, label: 'Alignment', price: 450 },
  });

  const computedFunctions = {
    calculateBMI: (args: Record<string, unknown>) => {
      const w = args.weight as number;
      const h = args.height as number;
      return Math.round((w / (h * h)) * 10) / 10;
    },
    greet: (args: Record<string, unknown>) => `Hello ${args.name}!`,
  };

  const resolver = createResolver({ store, computedFunctions });

  it('resolves $state', () => {
    expect(resolver.resolve({ $state: '/user/name' })).toBe('Alice');
  });

  it('resolves $template', () => {
    expect(resolver.resolve({ $template: 'Hi ${/user/name}, age ${/user/age}' })).toBe('Hi Alice, age 30');
  });

  it('resolves $computed with $state args', () => {
    expect(resolver.resolve({
      $computed: 'calculateBMI',
      args: { weight: { $state: '/patient/weight' }, height: { $state: '/patient/height' } },
    })).toBe(26.1);
  });

  it('resolves $cond with comparison', () => {
    expect(resolver.resolve({
      $cond: { $state: '/user/role', eq: 'admin' },
      $then: 'admin-panel',
      $else: 'user-panel',
    })).toBe('admin-panel');
  });

  it('resolves nested expressions ($cond with $template)', () => {
    expect(resolver.resolve({
      $cond: { $state: '/form/isValid' },
      $then: { $template: 'Welcome, ${/user/name}!' },
      $else: 'Please fix the form',
    })).toBe('Welcome, Alice!');
  });

  it('resolves $let/$ref to avoid repetition', () => {
    expect(resolver.resolve({
      $let: {
        bmi: { $computed: 'calculateBMI', args: { weight: { $state: '/patient/weight' }, height: { $state: '/patient/height' } } },
      },
      $in: { $ref: 'bmi' },
    })).toBe(26.1);
  });

  it('resolves literal values as-is', () => {
    expect(resolver.resolve('hello')).toBe('hello');
    expect(resolver.resolve(42)).toBe(42);
    expect(resolver.resolve(true)).toBe(true);
    expect(resolver.resolve(null)).toBeNull();
  });

  it('resolves plain objects as-is', () => {
    expect(resolver.resolve({ name: 'test', value: 123 })).toEqual({ name: 'test', value: 123 });
  });

  it('throws for unknown expression', () => {
    expect(() => resolver.resolve({ $unknown: 'x' })).toThrow();
  });

  it('resolves $let + $template with bindings', () => {
    expect(resolver.resolve({
      $let: {
        bmi: { $computed: 'calculateBMI', args: { weight: { $state: '/patient/weight' }, height: { $state: '/patient/height' } } },
      },
      $in: { $template: '${/user/name} has BMI ${bmi}' },
    })).toBe('Alice has BMI 26.1');
  });

  it('resolves nested expressions inside structured $let bodies', () => {
    expect(resolver.resolve({
      $let: {
        w: { $state: '/patient/weight' },
        h: { $state: '/patient/height' },
      },
      $in: {
        label: { $template: '${/user/name}' },
        metrics: {
          weight: { $ref: 'w' },
          height: { $ref: 'h' },
          bmi: { $computed: 'calculateBMI', args: { weight: { $ref: 'w' }, height: { $ref: 'h' } } },
        },
      },
    })).toEqual({
      label: 'Alice',
      metrics: {
        weight: 80,
        height: 1.75,
        bmi: 26.1,
      },
    });
  });

  it('resolves dotted paths inside $let bindings', () => {
    expect(resolver.resolve({
      $let: {
        service: { $state: '/service' },
        quantity: 2,
      },
      $in: {
        serviceId: { $ref: 'service.id' },
        serviceName: { $ref: 'service.label' },
        subtotal: { $math: 'multiply', args: [{ $ref: 'quantity' }, { $ref: 'service.price' }] },
        summary: { $template: '${service.label}: ${service.price}' },
      },
    })).toEqual({
      serviceId: 7,
      serviceName: 'Alignment',
      subtotal: 900,
      summary: 'Alignment: 450',
    });
  });

  it('throws when dotted $ref path is missing inside an existing binding', () => {
    expect(() => resolver.resolve({
      $let: {
        service: { $state: '/service' },
      },
      $in: { $ref: 'service.missingPrice' },
    })).toThrow('$ref "service.missingPrice"');
  });
});
