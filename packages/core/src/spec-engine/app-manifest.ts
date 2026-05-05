import type { AppSpec } from '../app/app-engine.js';
import type { Element } from '../types.js';
import { appendChildren, buildAnnotations } from './manifest.js';

export function generateAppManifest(appSpec: AppSpec): string {
  const lines: string[] = [];
  const nav = appSpec.navigation;
  const screenCount = Object.keys(appSpec.screens).length;
  const localeCount = appSpec.translations ? Object.keys(appSpec.translations).length : 0;

  // Header
  const countParts = [`${screenCount} screen${screenCount !== 1 ? 's' : ''}`];
  if (localeCount > 0) countParts.push(`${localeCount} locale${localeCount !== 1 ? 's' : ''}`);
  lines.push(`app: ${appSpec.name ?? ''} (${countParts.join(', ')})`);
  lines.push('');

  // Navigation
  let navLine = `navigation: ${nav.type}, initial: ${nav.initialScreen}`;
  if (nav.breadcrumb) navLine += `, breadcrumb: ${nav.breadcrumb}`;
  lines.push(navLine);

  // Auth
  if (nav.auth) {
    const auth = nav.auth;
    const authParts = ['auth: enabled'];
    if (auth.persistence) authParts.push(`persistence: ${auth.persistence}`);
    if (auth.tokenRefresh !== undefined) authParts.push(`tokenRefresh: ${auth.tokenRefresh}`);
    lines.push(authParts.join(', '));

    if (auth.protectedScreens?.length) {
      lines.push(`  protectedScreens: ${auth.protectedScreens.join(', ')}`);
    }
    if (auth.roleAccess) {
      const roleEntries = Object.entries(auth.roleAccess)
        .map(([role, screens]) => `${role}(${screens.join(', ')})`)
        .join(', ');
      lines.push(`  roleAccess: ${roleEntries}`);
    }
    if (auth.authDomains?.length) {
      lines.push(`  authDomains: ${auth.authDomains.join(', ')}`);
    }
  }
  lines.push('');

  // Screens
  const screenIds = Object.keys(appSpec.screens);
  lines.push('screens:');
  for (let i = 0; i < screenIds.length; i++) {
    const id = screenIds[i];
    const def = appSpec.screens[id];
    const isLast = i === screenIds.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    let line = `  ${connector}${id} — ${def.label}`;
    if (def.icon) line += ` (${def.icon})`;
    const extras: string[] = [];
    if (def.statePolicy && def.statePolicy !== 'preserve') extras.push(`statePolicy: ${def.statePolicy}`);
    if (def.roles) extras.push(`roles: ${def.roles.join(', ')}`);
    if (extras.length) line += ` [${extras.join(', ')}]`;
    lines.push(line);
  }
  lines.push('');

  // Tokens
  if (appSpec.tokens) {
    const tokens = appSpec.tokens as Record<string, unknown>;
    const parts: string[] = [];
    for (const [key, val] of Object.entries(tokens)) {
      if (key === 'components' || key === 'modes') continue;
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        parts.push(`${key}(${Object.keys(val as Record<string, unknown>).length})`);
      }
    }
    lines.push(`tokens: ${parts.join(', ')}`);

    // Components
    const components = tokens.components as Record<string, Record<string, unknown>> | undefined;
    if (components) {
      const compParts = Object.entries(components)
        .map(([type, variants]) => `${type}(${Object.keys(variants).join(', ')})`)
        .join(', ');
      lines.push(`  components: ${compParts}`);
    }

    // Modes
    const modes = tokens.modes as Record<string, unknown> | undefined;
    if (modes) {
      lines.push(`  modes: ${Object.keys(modes).join(', ')}`);
    }
    lines.push('');
  }

  // Translations
  if (appSpec.translations) {
    const translationEntries = Object.entries(appSpec.translations);
    const maxKeys = Math.max(...translationEntries.map(([, v]) => Object.keys(v).length));
    const parts = translationEntries.map(([locale, keys]) => {
      const keyCount = Object.keys(keys).length;
      let entry = `${locale}(${keyCount} key${keyCount !== 1 ? 's' : ''})`;
      if (keyCount < maxKeys) {
        entry += ` ⚠ ${maxKeys - keyCount} missing`;
      }
      return entry;
    });
    lines.push(`translations: ${parts.join(', ')}`);
    lines.push('');
  }

  // SharedState
  if (appSpec.sharedState) {
    lines.push(`sharedState: ${Object.keys(appSpec.sharedState).join(', ')}`);
    lines.push('');
  }

  // Templates
  if (appSpec.templates) {
    lines.push(`templates: ${Object.keys(appSpec.templates).join(', ')}`);
  } else {
    lines.push('templates: (none)');
  }
  lines.push('');

  // Layout tree
  const layoutElements = appSpec.layout.elements as Record<string, Element>;
  const layoutCount = Object.keys(layoutElements).length;
  lines.push(`layout: ${appSpec.layout.root} (${layoutCount} element${layoutCount !== 1 ? 's' : ''})`);
  lines.push('');

  const rootEl = layoutElements[appSpec.layout.root];
  if (rootEl) {
    const annotations = buildAnnotations(rootEl);
    lines.push(`root: ${appSpec.layout.root} (${rootEl.type})${annotations}`);
    if (rootEl.children && rootEl.children.length > 0) {
      appendChildren({ elements: layoutElements }, rootEl.children, lines, '');
    }
  }

  return lines.join('\n');
}
