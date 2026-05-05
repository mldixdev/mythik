import type { FormConfig, FormFieldConfig, FormEngineConfig, FormEngine } from './types.js';
import { validate } from '../validation/validators.js';
import type { ValidatorCheck } from '../validation/validators.js';

export function createFormEngine(config: FormEngineConfig): FormEngine {
  const { store, resolve, forms } = config;
  const unsubscribers: Array<() => void> = [];
  const initialValues = new Map<string, Map<string, unknown>>();
  // Cross-field deps: state path → Set of [formId, fieldId] that depend on it
  const crossFieldDeps = new Map<string, Array<{ formId: string; fieldId: string }>>();

  for (const [formId, formConfig] of Object.entries(forms)) {
    initForm(formId, formConfig);
  }

  function initForm(formId: string, formConfig: FormConfig): void {
    const fieldInitials = new Map<string, unknown>();

    for (const [fieldId, fieldConfig] of Object.entries(formConfig.fields)) {
      const initialValue = store.get(fieldConfig.statePath);
      fieldInitials.set(fieldId, initialValue);

      // Initialize field state
      store.set(`/ui/forms/${formId}/fields/${fieldId}/errors`, []);
      store.set(`/ui/forms/${formId}/fields/${fieldId}/touched`, false);
      store.set(`/ui/forms/${formId}/fields/${fieldId}/dirty`, false);

      // Scan rules for cross-field dependencies
      for (const rule of fieldConfig.rules) {
        if (rule.args) {
          scanDeps(rule.args, formId, fieldId);
        }
      }

      // Subscribe to field value changes
      const unsub = store.subscribePath(fieldConfig.statePath, () => {
        onFieldChange(formId, fieldId, formConfig);
      });
      unsubscribers.push(unsub);
    }

    initialValues.set(formId, fieldInitials);

    // Subscribe to cross-field dependency paths
    const subscribedDepPaths = new Set<string>();
    for (const [depPath, dependents] of crossFieldDeps.entries()) {
      const relevantDeps = dependents.filter(d => d.formId === formId);
      if (relevantDeps.length === 0 || subscribedDepPaths.has(depPath)) continue;
      subscribedDepPaths.add(depPath);

      const unsub = store.subscribePath(depPath, () => {
        for (const { formId: fId, fieldId } of relevantDeps) {
          const isTouched = store.get(`/ui/forms/${fId}/fields/${fieldId}/touched`);
          if (isTouched) {
            validateField(fId, fieldId, forms[fId].fields[fieldId]);
          }
        }
        recomputeFormState(formId, formConfig);
      });
      unsubscribers.push(unsub);
    }

    // Run silent initial validation
    recomputeFormState(formId, formConfig);
  }

  function scanDeps(args: Record<string, unknown>, formId: string, fieldId: string): void {
    for (const value of Object.values(args)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>;
        if ('$state' in obj && typeof obj.$state === 'string') {
          const path = obj.$state;
          if (!crossFieldDeps.has(path)) crossFieldDeps.set(path, []);
          crossFieldDeps.get(path)!.push({ formId, fieldId });
        }
      }
    }
  }

  function resolveRuleArgs(rule: ValidatorCheck): ValidatorCheck {
    if (!rule.args) return rule;
    const resolvedArgs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rule.args)) {
      resolvedArgs[key] = (value && typeof value === 'object') ? resolve(value) : value;
    }
    return { ...rule, args: resolvedArgs };
  }

  function validateField(formId: string, fieldId: string, fieldConfig: FormFieldConfig): void {
    const value = store.get(fieldConfig.statePath);
    const resolvedRules = fieldConfig.rules.map(resolveRuleArgs);
    const result = validate(value, resolvedRules);
    store.set(`/ui/forms/${formId}/fields/${fieldId}/errors`, result.errors);
  }

  function onFieldChange(formId: string, fieldId: string, formConfig: FormConfig): void {
    const fieldConfig = formConfig.fields[fieldId];
    const currentValue = store.get(fieldConfig.statePath);
    const initialValue = initialValues.get(formId)?.get(fieldId);

    // Track dirty
    const isDirty = currentValue !== initialValue;
    store.set(`/ui/forms/${formId}/fields/${fieldId}/dirty`, isDirty);

    // Validate if touched
    const isTouched = store.get(`/ui/forms/${formId}/fields/${fieldId}/touched`) as boolean;
    if (isTouched) {
      validateField(formId, fieldId, fieldConfig);
    }

    recomputeFormState(formId, formConfig);
  }

  function recomputeFormState(formId: string, formConfig: FormConfig): void {
    let totalErrors = 0;
    let allValid = true;
    let anyDirty = false;

    for (const [fieldId, fieldConfig] of Object.entries(formConfig.fields)) {
      // For isValid: always check current validity (even untouched)
      const value = store.get(fieldConfig.statePath);
      const resolvedRules = fieldConfig.rules.map(resolveRuleArgs);
      const result = validate(value, resolvedRules);
      if (!result.valid) allValid = false;

      // Error count: from displayed errors (only touched fields)
      const displayedErrors = (store.get(`/ui/forms/${formId}/fields/${fieldId}/errors`) as string[]) ?? [];
      totalErrors += displayedErrors.length;

      const dirty = store.get(`/ui/forms/${formId}/fields/${fieldId}/dirty`) as boolean;
      if (dirty) anyDirty = true;
    }

    store.set(`/ui/forms/${formId}/isValid`, allValid);
    store.set(`/ui/forms/${formId}/errorCount`, totalErrors);
    store.set(`/ui/forms/${formId}/isDirty`, anyDirty);
  }

  function validateFormFn(formId: string): boolean {
    const formConfig = forms[formId];
    if (!formConfig) return true;

    for (const [fieldId, fieldConfig] of Object.entries(formConfig.fields)) {
      store.set(`/ui/forms/${formId}/fields/${fieldId}/touched`, true);
      validateField(formId, fieldId, fieldConfig);
    }

    recomputeFormState(formId, formConfig);
    return (store.get(`/ui/forms/${formId}/isValid`) as boolean) ?? true;
  }

  function touchFieldFn(formId: string, fieldId: string): void {
    const formConfig = forms[formId];
    if (!formConfig || !formConfig.fields[fieldId]) return;

    store.set(`/ui/forms/${formId}/fields/${fieldId}/touched`, true);
    validateField(formId, fieldId, formConfig.fields[fieldId]);
    recomputeFormState(formId, formConfig);
  }

  function resetFormFn(formId: string): void {
    const formConfig = forms[formId];
    if (!formConfig) return;

    const fieldInitials = initialValues.get(formId);
    if (!fieldInitials) return;

    for (const [fieldId, fieldConfig] of Object.entries(formConfig.fields)) {
      const initialValue = fieldInitials.get(fieldId);
      store.set(fieldConfig.statePath, initialValue);
      store.set(`/ui/forms/${formId}/fields/${fieldId}/errors`, []);
      store.set(`/ui/forms/${formId}/fields/${fieldId}/touched`, false);
      store.set(`/ui/forms/${formId}/fields/${fieldId}/dirty`, false);
    }

    store.set(`/ui/forms/${formId}/isValid`, true);
    store.set(`/ui/forms/${formId}/errorCount`, 0);
    store.set(`/ui/forms/${formId}/isDirty`, false);
  }

  function destroy(): void {
    for (const unsub of unsubscribers) unsub();
    unsubscribers.length = 0;
  }

  return {
    validateForm: validateFormFn,
    touchField: touchFieldFn,
    resetForm: resetFormFn,
    destroy,
  };
}
