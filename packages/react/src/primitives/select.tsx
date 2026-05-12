import React from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { resolveLabelStyle } from 'mythik';
import { useDesignTokens } from './use-design-tokens.js';

interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  invalid?: boolean;
}

interface SelectProps {
  value?: string | number | boolean;
  options?: unknown[];
  placeholder?: string;
  label?: string;
  labelKey?: string;
  valueKey?: string;
  disabled?: boolean;
  required?: boolean;
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  onChange?: (value: string) => void;
}

function optionScalar(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function invalidOption(index: number, labelKey: string, valueKey: string): SelectOption {
  console.warn(`[Mythik] Invalid select option at index ${index}. Expected a string or an object with scalar "${labelKey}" and "${valueKey}" fields.`);
  return { label: 'Invalid option', value: `__invalid_${index}`, disabled: true, invalid: true };
}

function invalidOptionsList(): SelectOption[] {
  console.warn('[Mythik] Invalid select options. Expected options to be an array.');
  return [{ label: 'Invalid option', value: '__invalid_options', disabled: true, invalid: true }];
}

function normalizeOption(opt: unknown, index: number, labelKey: string, valueKey: string): SelectOption {
  if (typeof opt === 'string') {
    return { label: opt, value: opt };
  }
  if (!opt || typeof opt !== 'object') {
    return invalidOption(index, labelKey, valueKey);
  }

  const raw = opt as Record<string, unknown>;
  const label = optionScalar(raw[labelKey]);
  const value = optionScalar(raw[valueKey]);
  if (label !== undefined && value !== undefined) {
    return {
      label,
      value,
      disabled: raw.disabled === true,
      invalid: raw.invalid === true,
    };
  }

  return invalidOption(index, labelKey, valueKey);
}

export function Select({ value = '', options = [], placeholder, label, labelKey = 'label', valueKey = 'value', disabled, required, style, _tokens, onChange }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const listboxRef = React.useRef<HTMLDivElement>(null);
  const selectId = React.useId();
  const labelId = `${selectId}-label`;
  // Track button rect so the portaled listbox can position itself below the
  // trigger. Updated on open, scroll, and resize to stay anchored.
  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null);
  const t = useDesignTokens(_tokens);

  const optionList = Array.isArray(options) ? options : invalidOptionsList();
  const normalizedOptions = optionList.map((opt, index) => normalizeOption(opt, index, labelKey, valueKey));
  const selectedValue = value === undefined || value === null ? '' : String(value);
  const selectedLabel = normalizedOptions.find((o) => o.value === selectedValue)?.label ?? placeholder ?? 'Select...';

  const color = style?.color as string ?? 'inherit';

  // Position tracking: measure the button rect when open, re-measure on
  // scroll/resize so the portaled listbox stays anchored below the trigger.
  React.useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    function update() {
      if (buttonRef.current) setAnchorRect(buttonRef.current.getBoundingClientRect());
    }
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      // Close only if click is outside BOTH the trigger wrapper AND the
      // portaled listbox (listbox is in document.body, not inside ref).
      const inTrigger = ref.current?.contains(target);
      const inListbox = listboxRef.current?.contains(target);
      if (!inTrigger && !inListbox) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); }
  }

  function selectOption(val: string) {
    onChange?.(val);
    setOpen(false);
  }

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: t.spacing.unit,
        minWidth: 0,
        position: 'relative',
      }}
      ref={ref}
    >
      {label && (
        <label id={labelId} htmlFor={selectId} style={{ fontSize: t.typography.scale.sm.fontSize, fontWeight: t.typography.weight.medium, color, ...resolveLabelStyle(t.identity.labelStyle, t.colors.accent) }}>
          {label}
          {required && <span style={{ color: t.colors.error, marginLeft: 2 }}>*</span>}
        </label>
      )}
      <button
        id={selectId}
        ref={buttonRef}
        type="button" role="combobox" aria-expanded={open} aria-haspopup="listbox"
        aria-labelledby={label ? labelId : undefined}
        disabled={disabled} onClick={() => !disabled && setOpen(!open)} onKeyDown={handleKeyDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `${t.spacing.scale.sm}px ${t.spacing.scale.sm + t.spacing.unit}px`,
          borderRadius: t.radius(t.shape.radius.md), fontSize: t.typography.scale.sm.fontSize, fontFamily: t.typography.fontFamily.base,
          cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
          color, outline: 'none', width: '100%', minWidth: 0, boxSizing: 'border-box', textAlign: 'left',
          transition: `border-color ${t.motion.duration.fast}ms ${t.motion.easing.default}, box-shadow ${t.motion.duration.fast}ms ${t.motion.easing.default}`,
          ...t.surface.input,
          ...(open ? t.surface.inputFocus : {}),
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: selectedValue ? 1 : 0.5 }}>
          {selectedLabel}
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ flexShrink: 0, marginLeft: 8, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: `transform ${t.motion.duration.fast}ms` }}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && anchorRect && typeof document !== 'undefined' && createPortal(
        // Portal to document.body — decouples the listbox from any ancestor
        // stacking context in the renderer tree. Without portal, neighboring
        // elements with explicit z-index (e.g., sticky toolbars at z:10) can
        // compete with the listbox at intermediate stacking contexts and win
        // visually even when the listbox's own z is higher. At document.body
        // the listbox competes only with other top-level portals; zIndex
        // 9999 keeps it above typical modal/toast layers.
        <div ref={listboxRef} role="listbox" style={{
          position: 'fixed',
          top: anchorRect.bottom + 4,
          left: anchorRect.left,
          width: anchorRect.width,
          borderRadius: t.radius(t.shape.radius.lg), zIndex: 9999,
          overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
          ...t.surface.modal,
        }}>
          {placeholder && (
            <div role="option" aria-selected={value === ''} onClick={() => selectOption('')}
              style={{ padding: `${t.spacing.scale.sm}px ${t.spacing.scale.sm + t.spacing.unit}px`, fontSize: t.typography.scale.sm.fontSize, color, opacity: 0.5, cursor: 'pointer' }}>
              {placeholder}
            </div>
          )}
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === selectedValue;
            return (
              <div key={opt.value} role="option" aria-selected={isSelected} aria-disabled={opt.disabled ? true : undefined} onClick={() => { if (!opt.disabled) selectOption(opt.value); }}
                style={{
                  padding: `${t.spacing.scale.sm}px ${t.spacing.scale.sm + t.spacing.unit}px`, fontSize: t.typography.scale.sm.fontSize, fontFamily: t.typography.fontFamily.base, cursor: opt.disabled ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: isSelected ? `${t.colors.primary}20` : 'transparent',
                  color: isSelected ? t.colors.primary : color,
                  opacity: opt.disabled ? 0.65 : 1,
                  fontWeight: isSelected ? t.typography.weight.semibold : t.typography.weight.normal, transition: 'background-color 100ms',
                }}
                onMouseEnter={(e) => { if (!isSelected && !opt.disabled) e.currentTarget.style.backgroundColor = `${t.colors.primary}10`; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
