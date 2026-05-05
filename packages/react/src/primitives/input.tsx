import React from 'react';
import type { CSSProperties } from 'react';
import { resolveLabelStyle } from 'mythik';
import { useDesignTokens } from './use-design-tokens.js';

interface ValidationCheck {
  type: string;
  message?: string;
  args?: Record<string, unknown>;
}

interface InputProps {
  value?: string | number;
  type?: 'text' | 'number' | 'email' | 'password' | 'phone' | 'url' | 'date' | 'color';
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  format?: 'phone' | 'currency' | 'none';
  /** Options for currency/number formatting. */
  formatOptions?: { locale?: string; currency?: string };
  /** Select all text on focus. Default: true when format is set, false otherwise. */
  selectOnFocus?: boolean;
  checks?: ValidationCheck[];
  validateOn?: 'change' | 'blur' | 'submit';
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
}

function formatDisplay(raw: string | number, format?: string, options?: { locale?: string; currency?: string }): string {
  const str = String(raw);
  if (!format || format === 'none') return str;
  if (format === 'phone') {
    const digits = str.replace(/\D/g, '');
    if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    if (digits.length === 7) return `${digits.slice(0,3)}-${digits.slice(3)}`;
    return str;
  }
  if (format === 'currency') {
    const num = Number(str);
    if (Number.isNaN(num)) return str;
    return new Intl.NumberFormat(options?.locale ?? 'en-US', {
      style: 'currency',
      currency: options?.currency ?? 'USD',
    }).format(num);
  }
  return str;
}

/** Simple heuristic: if a hex/rgb color has low brightness, it's dark */
function looksLikeDark(color: string): boolean {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }
  return false;
}

function stripFormat(formatted: string, format?: string): string {
  if (!format || format === 'none') return formatted;
  if (format === 'phone') return formatted.replace(/\D/g, '');
  if (format === 'currency') return formatted.replace(/[^0-9.\-]/g, '').replace(/(\..*)\./g, '$1').replace(/(?!^)-/g, '');
  return formatted;
}

/** Format currency while typing — allows incomplete decimals like "$1,234." */
function liveFormatCurrency(raw: string): string {
  if (!raw) return '';
  const negative = raw.startsWith('-');
  const clean = raw.replace(/^-/, '');
  const [intPart, decPart] = clean.split('.');
  const digits = intPart.replace(/^0+(?=\d)/, '') || '0';
  const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  return `${negative ? '-' : ''}$${formatted}`;
}

const BUILTIN_VALIDATORS: Record<string, (value: string, args?: Record<string, unknown>) => string | null> = {
  required: (v) => (!v || !v.trim()) ? 'This field is required' : null,
  email: (v) => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email' : null,
  minLength: (v, args) => v && v.length < (args?.min as number ?? 0) ? `Minimum ${args?.min} characters` : null,
  maxLength: (v, args) => v && v.length > (args?.max as number ?? Infinity) ? `Maximum ${args?.max} characters` : null,
  numeric: (v) => v && isNaN(Number(v)) ? 'Must be a number' : null,
  min: (v, args) => v && Number(v) < (args?.min as number ?? -Infinity) ? `Minimum value is ${args?.min}` : null,
  max: (v, args) => v && Number(v) > (args?.max as number ?? Infinity) ? `Maximum value is ${args?.max}` : null,
  pattern: (v, args) => v && args?.pattern && !new RegExp(args.pattern as string).test(v) ? 'Invalid format' : null,
  url: (v) => v && !/^https?:\/\/.+/.test(v) ? 'Invalid URL' : null,
};

function runChecks(value: string, checks?: ValidationCheck[], required?: boolean): string[] {
  const errors: string[] = [];
  if (required && (!value || !value.trim())) {
    errors.push('This field is required');
  }
  if (checks) {
    for (const check of checks) {
      const validator = BUILTIN_VALIDATORS[check.type];
      if (validator) {
        const error = validator(value, check.args);
        if (error) errors.push(check.message ?? error);
      }
    }
  }
  return errors;
}

export function Input({ value = '', type = 'text', placeholder, label, disabled, readOnly, required, format, formatOptions, selectOnFocus, checks, validateOn = 'blur', style, _tokens, onChange, onSubmit }: InputProps) {
  const t = useDesignTokens(_tokens);
  const color = style?.color as string ?? 'inherit';
  const inputId = React.useId();
  // Detect dark mode for native date/time picker icon visibility
  const isDark = t.colors.surface ? looksLikeDark(t.colors.surface) : false;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const cursorRef = React.useRef<number | null>(null);
  const [focused, setFocused] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  // For currency: local editing state (null = not editing, string = raw text while typing)
  const [rawText, setRawText] = React.useState<string | null>(null);

  // Restore cursor position after React re-renders the controlled input
  React.useLayoutEffect(() => {
    if (cursorRef.current !== null && inputRef.current && document.activeElement === inputRef.current) {
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
      cursorRef.current = null;
    }
  });

  const hasChecks = !!checks?.length || !!required;

  // Display value logic:
  // - currency editing: liveFormat the raw text (preserves incomplete decimals)
  // - currency not editing: full Intl format
  // - other formats: formatDisplay
  // - no format: raw string
  let displayValue: string;
  if (format === 'currency') {
    if (rawText !== null) {
      displayValue = liveFormatCurrency(rawText);
    } else {
      const num = Number(value);
      displayValue = (value === '' || value === undefined || value === null || (num === 0 && String(value) === ''))
        ? '' : formatDisplay(value, format, formatOptions);
    }
  } else {
    displayValue = format ? formatDisplay(value, format, formatOptions) : String(value);
  }

  function validate(val: string) {
    if (!hasChecks) return;
    const errs = runChecks(val, checks, required);
    setErrors(errs);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Save cursor position before state update triggers re-render
    cursorRef.current = e.target.selectionStart;

    if (format === 'currency') {
      const raw = stripFormat(e.target.value, format);
      setRawText(raw);
      const parsed = parseFloat(raw);
      onChange?.(isNaN(parsed) ? '0' : String(parsed));
    } else {
      const raw = format ? stripFormat(e.target.value, format) : e.target.value;
      onChange?.(raw);
    }
    if (touched && validateOn === 'change') validate(stripFormat(e.target.value, format));
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setFocused(true);
    if (format === 'currency') {
      // Enter edit mode: set rawText to current numeric value
      const num = Number(value);
      setRawText(num === 0 ? '' : String(num));
    }
    // Select all on focus: default true when format is set, false otherwise
    const shouldSelect = selectOnFocus ?? !!format;
    if (shouldSelect) {
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }

  function handleBlur() {
    setFocused(false);
    setRawText(null); // Exit edit mode — display switches to full Intl format
    setTouched(true);
    if (validateOn === 'blur' || validateOn === 'change') validate(String(value));
  }

  const hasError = touched && errors.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: t.spacing.unit, minWidth: 0 }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: t.typography.scale.sm.fontSize, fontWeight: t.typography.weight.medium, fontFamily: t.typography.fontFamily.base, color, ...resolveLabelStyle(t.identity.labelStyle, t.colors.accent) }}>
          {label}
          {required && <span style={{ color: t.colors.error, marginLeft: 2 }}>*</span>}
        </label>
      )}
      <input
        id={inputId}
        ref={inputRef}
        type={type}
        inputMode={format === 'currency' ? 'decimal' : undefined}
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={onSubmit ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } } : undefined}
        style={{
          padding: `${t.spacing.scale.sm}px ${t.spacing.scale.sm + t.spacing.unit}px`,
          borderRadius: t.radius(t.shape.radius.md),
          fontSize: t.typography.scale.sm.fontSize,
          fontFamily: t.typography.fontFamily.base,
          color,
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          outline: 'none',
          transition: `border-color ${t.motion.duration.fast}ms ${t.motion.easing.default}, box-shadow ${t.motion.duration.fast}ms ${t.motion.easing.default}`,
          colorScheme: isDark ? 'dark' : 'light',
          ...t.surface.input,
          ...(focused ? t.surface.inputFocus : {}),
          ...(hasError ? { borderColor: t.colors.error } : {}),
          ...style,
        }}
      />
      {hasError && (
        <span style={{ fontSize: t.typography.scale.xs.fontSize, color: t.colors.error, marginTop: t.spacing.unit }}>
          {errors[0]}
        </span>
      )}
    </div>
  );
}
