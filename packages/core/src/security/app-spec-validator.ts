import type { AppSpec } from '../app/app-engine.js';
import type { SpecValidationResult, ValidationError, ValidationContext } from './spec-validator.js';
import { validateSpec } from './spec-validator.js';
import { suggest } from '../utils/levenshtein.js';
import type { Element } from '../types.js';
import { validateIdentityTokens } from './identity-token-validator.js';
import { RESERVED_PATHS } from '../state/reserved-paths.js';

export function validateAppSpec(appSpec: AppSpec, context: ValidationContext = {}): SpecValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const screenIds = Object.keys(appSpec.screens);
  const nav = appSpec.navigation;

  // Level 1: Layout validation — reuse validateSpec on virtual Spec
  const virtualSpec = {
    root: appSpec.layout.root,
    elements: appSpec.layout.elements as Record<string, Element>,
  };
  const layoutValidation = validateSpec(virtualSpec, context);
  for (const err of layoutValidation.errors) {
    errors.push({
      ...err,
      path: err.path ? `/layout${err.path}` : err.path,
    });
  }

  // Level 2: Cross-reference checks

  if (appSpec.tokens?.identity !== undefined) {
    validateIdentityTokens(appSpec.tokens.identity, '/tokens/identity', errors);
  }

  // initialScreen must exist in screens
  if (!appSpec.screens[nav.initialScreen]) {
    errors.push({
      message: `navigation.initialScreen "${nav.initialScreen}" not found in screens`,
      path: '/navigation/initialScreen',
    });
  }

  validateEditorSessionGuard(nav.editorSessionGuard, errors);

  // Auth checks
  if (nav.auth) {
    const auth = nav.auth;

    // loginScreen must exist
    if (!appSpec.screens[auth.loginScreen]) {
      errors.push({
        message: `navigation.auth.loginScreen "${auth.loginScreen}" not found in screens`,
        path: '/navigation/auth/loginScreen',
      });
    }

    // protectedScreens items must exist (except *)
    if (auth.protectedScreens) {
      for (let i = 0; i < auth.protectedScreens.length; i++) {
        const s = auth.protectedScreens[i];
        if (s !== '*' && !appSpec.screens[s]) {
          errors.push({
            message: `navigation.auth.protectedScreens[${i}] "${s}" not found in screens`,
            path: `/navigation/auth/protectedScreens/${i}`,
          });
        }
      }
    }

    // roleAccess screen references must exist (except *)
    if (auth.roleAccess) {
      for (const [role, screens] of Object.entries(auth.roleAccess)) {
        for (let i = 0; i < screens.length; i++) {
          const s = screens[i];
          if (s !== '*' && !appSpec.screens[s]) {
            const error: ValidationError = {
              message: `navigation.auth.roleAccess.${role}[${i}] "${s}" not found in screens`,
              path: `/navigation/auth/roleAccess/${role}/${i}`,
            };
            const suggested = suggest(s, screenIds);
            if (suggested) {
              error.suggestedFixes = [{
                patch: { op: 'replace', path: `/navigation/auth/roleAccess/${role}/${i}`, value: suggested },
                confidence: 'high',
                description: `screen '${s}' → '${suggested}' (Levenshtein match)`,
              }];
            }
            errors.push(error);
          }
        }
      }
    }
  }

  // menu items must exist in screens
  if (nav.menu) {
    for (let i = 0; i < nav.menu.length; i++) {
      const s = nav.menu[i];
      if (!appSpec.screens[s]) {
        const error: ValidationError = {
          message: `navigation.menu[${i}] "${s}" not found in screens`,
          path: `/navigation/menu/${i}`,
        };
        const suggested = suggest(s, screenIds);
        if (suggested) {
          error.suggestedFixes = [{
            patch: { op: 'replace', path: `/navigation/menu/${i}`, value: suggested },
            confidence: 'high',
            description: `screen '${s}' → '${suggested}' (Levenshtein match)`,
          }];
        }
        errors.push(error);
      }
    }
  }

  // Translation key consistency (warnings only)
  if (appSpec.translations) {
    const locales = Object.entries(appSpec.translations);
    if (locales.length > 1) {
      const allKeys = new Set<string>();
      for (const [, keys] of locales) {
        for (const k of Object.keys(keys)) allKeys.add(k);
      }
      for (const [locale, keys] of locales) {
        const localeKeys = new Set(Object.keys(keys));
        const missing = [...allKeys].filter(k => !localeKeys.has(k));
        if (missing.length > 0) {
          warnings.push({
            message: `translations.${locale}: ${missing.length} key${missing.length !== 1 ? 's' : ''} missing (${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''})`,
            path: `/translations/${locale}`,
          });
        }
      }
    }
  }

  // Warnings don't affect validity
  const allIssues = [...errors, ...warnings];
  return { valid: errors.length === 0, errors: allIssues };
}

function validateEditorSessionGuard(value: unknown, errors: ValidationError[]): void {
  if (value === undefined) return;

  if (!isRecord(value)) {
    errors.push({
      message: 'navigation.editorSessionGuard must be an object',
      path: '/navigation/editorSessionGuard',
    });
    return;
  }

  validateOptionalBoolean(value, 'enabled', errors);
  validateOptionalBoolean(value, 'blockNavigation', errors);
  validateOptionalBoolean(value, 'blockGoBack', errors);
  validateOptionalBoolean(value, 'blockBrowserUnload', errors);

  if (value.sessions !== undefined) {
    if (!Array.isArray(value.sessions)) {
      errors.push({
        message: 'navigation.editorSessionGuard.sessions must be an array of editor session ids',
        path: '/navigation/editorSessionGuard/sessions',
      });
    } else {
      value.sessions.forEach((session, index) => {
        if (typeof session !== 'string' || session.length === 0) {
          errors.push({
            message: `navigation.editorSessionGuard.sessions[${index}] must be a non-empty string`,
            path: `/navigation/editorSessionGuard/sessions/${index}`,
          });
        }
      });
    }
  }

  if (value.pendingPath !== undefined) {
    if (typeof value.pendingPath !== 'string') {
      errors.push({
        message: 'navigation.editorSessionGuard.pendingPath must be a state path string',
        path: '/navigation/editorSessionGuard/pendingPath',
      });
      return;
    }

    if (!isConcreteUiPath(value.pendingPath)) {
      errors.push({
        message: 'navigation.editorSessionGuard.pendingPath must be under /ui/<segment>',
        path: '/navigation/editorSessionGuard/pendingPath',
      });
      return;
    }

    if (isReservedPathCollision(value.pendingPath)) {
      errors.push({
        message: `navigation.editorSessionGuard.pendingPath "${value.pendingPath}" collides with a framework-reserved path`,
        path: '/navigation/editorSessionGuard/pendingPath',
      });
    }
  }
}

function validateOptionalBoolean(value: Record<string, unknown>, key: string, errors: ValidationError[]): void {
  if (value[key] === undefined || typeof value[key] === 'boolean') return;
  errors.push({
    message: `navigation.editorSessionGuard.${key} must be a boolean`,
    path: `/navigation/editorSessionGuard/${key}`,
  });
}

function isConcreteUiPath(path: string): boolean {
  return /^\/ui\/[^/]+(?:\/.*)?$/.test(path);
}

function isReservedPathCollision(path: string): boolean {
  return Object.values(RESERVED_PATHS).some((reserved) => (
    path === reserved
    || path.startsWith(`${reserved}/`)
    || reserved.startsWith(`${path}/`)
  ));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
