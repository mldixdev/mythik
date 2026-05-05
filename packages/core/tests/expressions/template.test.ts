import { describe, it, expect } from 'vitest';
import { templateHandler } from '../../src/expressions/handlers/template.js';
import { createStateStore } from '../../src/state/store.js';
import type { ResolverContext } from '../../src/types.js';

describe('$template handler', () => {
  const store = createStateStore({
    user: { name: 'Alice', age: 30 },
    inbox: { count: 3 },
  });

  const context: ResolverContext = {
    getState: (path) => store.get(path),
    setState: (path, value) => store.set(path, value),
  };

  it('interpolates state references in a string', () => {
    expect(templateHandler.resolve({ $template: 'Hello, ${/user/name}!' }, context)).toBe('Hello, Alice!');
  });

  it('interpolates multiple references', () => {
    expect(templateHandler.resolve(
      { $template: '${/user/name} has ${/inbox/count} messages' }, context,
    )).toBe('Alice has 3 messages');
  });

  it('resolves missing paths to empty string', () => {
    expect(templateHandler.resolve({ $template: 'Hi ${/user/missing}!' }, context)).toBe('Hi !');
  });

  it('returns string with no interpolation as-is', () => {
    expect(templateHandler.resolve({ $template: 'No variables here' }, context)).toBe('No variables here');
  });

  it('handles number values', () => {
    expect(templateHandler.resolve({ $template: 'Age: ${/user/age}' }, context)).toBe('Age: 30');
  });

  it('interpolates $let bindings', () => {
    const ctxWithBindings: ResolverContext = {
      ...context,
      letBindings: { age: 34, greeting: 'Hola' },
    };
    expect(templateHandler.resolve(
      { $template: '${greeting}, you are ${age} years old' }, ctxWithBindings,
    )).toBe('Hola, you are 34 years old');
  });

  it('mixes state paths and $let bindings', () => {
    const ctxWithBindings: ResolverContext = {
      ...context,
      letBindings: { score: 95 },
    };
    expect(templateHandler.resolve(
      { $template: '${/user/name} scored ${score}' }, ctxWithBindings,
    )).toBe('Alice scored 95');
  });

  it('returns empty for undefined $let binding', () => {
    expect(templateHandler.resolve(
      { $template: 'Value: ${undefined_binding}' }, context,
    )).toBe('Value: ');
  });

  it('has the correct key', () => {
    expect(templateHandler.key).toBe('$template');
  });
});
