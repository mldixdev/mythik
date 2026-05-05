import type { ValidatorCheck } from '../validation/validators.js';
import type { StateStore } from '../state/store.js';

export interface FormFieldConfig {
  /** State path where this field's value lives */
  statePath: string;
  /** Validation rules — same format as input checks, supports expressions in args */
  rules: ValidatorCheck[];
}

export interface FormConfig {
  /** Map of field ID → field configuration */
  fields: Record<string, FormFieldConfig>;
  /** When to validate: 'blur' (default) or 'change' */
  validateOn?: 'blur' | 'change';
}

export interface FormEngineConfig {
  store: StateStore;
  resolve: (expr: unknown) => unknown;
  forms: Record<string, FormConfig>;
}

export interface FormEngine {
  /** Validate all fields in a form. Marks all as touched. Returns isValid. */
  validateForm: (formId: string) => boolean;
  /** Mark a field as touched and validate it */
  touchField: (formId: string, fieldId: string) => void;
  /** Reset form to initial values and clear all validation state */
  resetForm: (formId: string) => void;
  /** Clean up all subscriptions */
  destroy: () => void;
}
