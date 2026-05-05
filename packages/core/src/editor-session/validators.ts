import type { StateStore } from '../state/store.js';
import type { EditorSessionValidatorConfig } from '../types.js';
import type { EditorSessionValidationIssue, EditorSessionValidationResult } from './types.js';
import { stableStringify } from './clone.js';

export function validateEditorSessionDocument(
  store: StateStore,
  validators: EditorSessionValidatorConfig[],
  checkedAt = new Date().toISOString(),
): EditorSessionValidationResult {
  const errors: EditorSessionValidationIssue[] = [];

  for (const validator of validators) {
    if (validator.type === 'pathExists') validatePathExists(store, validator.path, errors);
    if (validator.type === 'jsonSerializable') validateJsonSerializable(store, validator.path, errors);
    if (validator.type === 'arrayUniqueField') validateArrayUniqueField(store, validator.path, validator.field, errors);
    if (validator.type === 'arrayObjects') validateArrayObjects(store, validator.path, errors);
  }

  return { valid: errors.length === 0, errors, warnings: [], checkedAt };
}

function validatePathExists(store: StateStore, path: string, errors: EditorSessionValidationIssue[]): void {
  if (store.get(path) === undefined) {
    errors.push({ code: 'path-missing', path, message: `Tracked path "${path}" is missing` });
  }
}

function validateJsonSerializable(store: StateStore, path: string, errors: EditorSessionValidationIssue[]): void {
  const issue = findNonJsonValue(store.get(path), path);
  if (issue) {
    errors.push(issue);
    return;
  }

  try {
    stableStringify(store.get(path));
  } catch (error) {
    errors.push({
      code: 'json-serializable',
      path,
      message: `Path "${path}" is not JSON serializable: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

function findNonJsonValue(value: unknown, path: string, stack = new WeakSet<object>()): EditorSessionValidationIssue | null {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    return { code: 'json-serializable', path, message: `Path "${path}" contains a non-JSON value` };
  }
  if (value === null || typeof value !== 'object') return null;
  if (stack.has(value)) {
    return { code: 'json-serializable', path, message: `Path "${path}" contains a circular reference` };
  }
  stack.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const issue = findNonJsonValue(value[index], `${path}/${index}`, stack);
      if (issue) return issue;
    }
    stack.delete(value);
    return null;
  }

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return { code: 'json-serializable', path, message: `Path "${path}" contains a non-plain object` };
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const issue = findNonJsonValue(nestedValue, `${path}/${key}`, stack);
    if (issue) return issue;
  }
  stack.delete(value);
  return null;
}

function validateArrayObjects(store: StateStore, path: string, errors: EditorSessionValidationIssue[]): void {
  const value = store.get(path);
  if (!Array.isArray(value)) {
    errors.push({ code: 'array-objects', path, message: `Path "${path}" must be an array` });
    return;
  }
  value.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({ code: 'array-objects', path: `${path}/${index}`, message: `Path "${path}/${index}" must be an object` });
    }
  });
}

function validateArrayUniqueField(store: StateStore, path: string, field: string, errors: EditorSessionValidationIssue[]): void {
  const value = store.get(path);
  if (!Array.isArray(value)) {
    errors.push({ code: 'array-unique-field', path, message: `Path "${path}" must be an array for unique field validation` });
    return;
  }

  const seen = new Set<string>();
  value.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({ code: 'array-unique-field', path: `${path}/${index}`, message: `Path "${path}/${index}" must be an object with field "${field}"` });
      return;
    }
    const fieldValue = (item as Record<string, unknown>)[field];
    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
      errors.push({ code: 'array-unique-field', path: `${path}/${index}/${field}`, message: `Path "${path}/${index}" is missing unique field "${field}"` });
      return;
    }
    const key = String(fieldValue);
    if (seen.has(key)) {
      errors.push({ code: 'array-unique-field', path: `${path}/${index}/${field}`, message: `Path "${path}" has duplicate "${field}" value "${key}"` });
      return;
    }
    seen.add(key);
  });
}
