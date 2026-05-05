import { describe, it, expect, beforeEach } from 'vitest';
import { createExpressionRegistry } from '../../src/expressions/registry.js';
import type { ResolverContext, ExpressionHandlerDefinition } from '../../src/types.js';

describe('ExpressionRegistry', () => {
  let registry: ReturnType<typeof createExpressionRegistry>;

  const mockContext: ResolverContext = {
    getState: () => undefined,
    setState: () => {},
  };

  beforeEach(() => {
    registry = createExpressionRegistry();
  });

  it('registers and retrieves a handler', () => {
    const handler: ExpressionHandlerDefinition = {
      key: '$test',
      resolve: (expr) => (expr as Record<string, unknown>).$test,
    };
    registry.register(handler);
    expect(registry.has('$test')).toBe(true);
  });

  it('resolves an expression using the registered handler', () => {
    registry.register({
      key: '$test',
      resolve: (expr) => `resolved:${(expr as Record<string, unknown>).$test}`,
    });
    const result = registry.resolve({ $test: 'hello' }, mockContext);
    expect(result).toBe('resolved:hello');
  });

  it('returns literal values as-is', () => {
    expect(registry.resolve('hello', mockContext)).toBe('hello');
    expect(registry.resolve(42, mockContext)).toBe(42);
    expect(registry.resolve(true, mockContext)).toBe(true);
    expect(registry.resolve(null, mockContext)).toBeNull();
  });

  it('returns arrays as-is', () => {
    expect(registry.resolve([1, 2, 3], mockContext)).toEqual([1, 2, 3]);
  });

  it('throws for unknown expression key', () => {
    expect(() => registry.resolve({ $unknown: 'x' }, mockContext)).toThrow(
      'No handler registered for expression key "$unknown"'
    );
  });

  it('detects expression key as the first $-prefixed key', () => {
    registry.register({
      key: '$foo',
      resolve: (expr) => `foo:${(expr as Record<string, unknown>).$foo}`,
    });
    const result = registry.resolve({ $foo: 'bar', otherProp: 123 }, mockContext);
    expect(result).toBe('foo:bar');
  });

  it('treats objects without $-keys as plain objects', () => {
    const obj = { name: 'Alice', age: 30 };
    expect(registry.resolve(obj, mockContext)).toEqual(obj);
  });
});
