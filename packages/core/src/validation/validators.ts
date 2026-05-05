export interface ValidatorCheck {
  type: string;
  message?: string;
  args?: Record<string, unknown>;
  enabled?: unknown; // Condition expression — resolved externally before calling
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

type ValidateFn = (value: unknown, args?: Record<string, unknown>) => boolean;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/;

/** Built-in validators. Each returns true if valid. */
const BUILTIN_VALIDATORS: Record<string, ValidateFn> = {
  required: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  },

  email: (value) => {
    if (!value || typeof value !== 'string') return true; // Only validate if there's a value
    return EMAIL_REGEX.test(value);
  },

  minLength: (value, args) => {
    if (!value || typeof value !== 'string') return true;
    const min = (args?.min as number) ?? 0;
    return value.length >= min;
  },

  maxLength: (value, args) => {
    if (!value || typeof value !== 'string') return true;
    const max = (args?.max as number) ?? Infinity;
    return value.length <= max;
  },

  pattern: (value, args) => {
    if (!value || typeof value !== 'string') return true;
    const pat = args?.pattern as string;
    if (!pat) return true;
    return new RegExp(pat).test(value);
  },

  min: (value, args) => {
    if (value === null || value === undefined) return true;
    const num = Number(value);
    if (Number.isNaN(num)) return true;
    return num >= ((args?.min as number) ?? -Infinity);
  },

  max: (value, args) => {
    if (value === null || value === undefined) return true;
    const num = Number(value);
    if (Number.isNaN(num)) return true;
    return num <= ((args?.max as number) ?? Infinity);
  },

  numeric: (value) => {
    if (value === null || value === undefined || value === '') return true;
    return !Number.isNaN(Number(value));
  },

  url: (value) => {
    if (!value || typeof value !== 'string') return true;
    return URL_REGEX.test(value);
  },

  matches: (value, args) => {
    if (value === null || value === undefined) return true;
    return value === args?.other;
  },

  equalTo: (value, args) => {
    if (value === null || value === undefined) return true;
    return value === args?.other;
  },

  lessThan: (value, args) => {
    if (value === null || value === undefined) return true;
    return Number(value) < Number(args?.other);
  },

  greaterThan: (value, args) => {
    if (value === null || value === undefined) return true;
    return Number(value) > Number(args?.other);
  },

  requiredIf: (value, args) => {
    const conditionField = args?.field;
    // If the condition field is truthy, then this field is required
    if (conditionField) {
      return BUILTIN_VALIDATORS.required(value);
    }
    return true; // Condition not met, skip validation
  },
};

const DEFAULT_MESSAGES: Record<string, string> = {
  required: 'This field is required',
  email: 'Invalid email address',
  minLength: 'Too short',
  maxLength: 'Too long',
  pattern: 'Invalid format',
  min: 'Value is too small',
  max: 'Value is too large',
  numeric: 'Must be a number',
  url: 'Invalid URL',
  matches: 'Fields do not match',
  equalTo: 'Fields do not match',
  lessThan: 'Must be less than the other field',
  greaterThan: 'Must be greater than the other field',
  requiredIf: 'This field is required',
};

/** Custom validators can be added at runtime */
const customValidators = new Map<string, ValidateFn>();

export function registerValidator(name: string, fn: ValidateFn): void {
  customValidators.set(name, fn);
}

export function getValidator(name: string): ValidateFn | undefined {
  return BUILTIN_VALIDATORS[name] ?? customValidators.get(name);
}

/**
 * Run a list of validation checks against a value.
 * Each check specifies a validator type, optional args, and optional message.
 */
export function validate(value: unknown, checks: ValidatorCheck[]): ValidationResult {
  const errors: string[] = [];

  for (const check of checks) {
    // Skip disabled checks (enabled is resolved externally before calling)
    if (check.enabled === false) continue;

    const fn = getValidator(check.type);
    if (!fn) {
      errors.push(`Unknown validator: "${check.type}"`);
      continue;
    }

    const isValid = fn(value, check.args);
    if (!isValid) {
      errors.push(check.message ?? DEFAULT_MESSAGES[check.type] ?? `Validation failed: ${check.type}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
