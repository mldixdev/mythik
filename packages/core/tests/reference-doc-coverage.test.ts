/**
 * Reference Doc Coverage Test — Self-Updating
 *
 * Reads feature registrations DIRECTLY from source code, then verifies
 * each one is documented in reference-doc.md. No hardcoded lists.
 *
 * If anyone adds a feature to the code without updating the doc, this test fails.
 * If anyone adds a feature to the code without updating THIS test, it still fails
 * — because this test reads from the source files, not from manual lists.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf-8');

const referenceDoc = read('docs/consumer/reference-doc.md');

// ─── Expression Handlers (auto-extracted from source) ───

const handlersIndex = read('packages/core/src/expressions/handlers/index.ts');
const handlerImports = [...handlersIndex.matchAll(/import\s+\{[^}]*\}\s+from\s+'\.\/([^']+)'/g)]
  .map(m => m[1].replace('.js', ''));

// Read each handler file to extract the key
const handlerKeys: string[] = [];
for (const file of handlerImports) {
  const content = read(`packages/core/src/expressions/handlers/${file}.ts`);
  const keyMatches = content.matchAll(/key:\s*'(\$[^']+)'/g);
  for (const m of keyMatches) {
    handlerKeys.push(m[1]);
  }
}

describe('Reference Doc — Expression Handlers (auto-extracted)', () => {
  it('found at least 20 handlers in source', () => {
    expect(handlerKeys.length).toBeGreaterThanOrEqual(20);
  });

  for (const key of handlerKeys) {
    it(`documents expression handler "${key}"`, () => {
      const escaped = key.replace('$', '\\$');
      const found = new RegExp(escaped).test(referenceDoc);
      expect(found, `Expression "${key}" exists in code but NOT in reference-doc.md`).toBe(true);
    });
  }
});

// ─── Built-in Actions (auto-extracted from dispatcher source) ───

const dispatcherSrc = read('packages/core/src/actions/dispatcher.ts');
// Extract keys from the builtinActions object literal: "  actionName: (params) =>" or "  actionName: () =>"
const actionMatches = [...dispatcherSrc.matchAll(/^\s{4}(\w+):\s*(?:async\s*)?\(/gm)];
const builtinActions = actionMatches
  .map(m => m[1])
  .filter(a => !['store', 'customActions', 'fetcher', 'middlewareChain'].includes(a)); // exclude non-action variables

// Also check auth actions registered in MythikApp
const mythikAppSrc = read('packages/react/src/MythikApp.tsx');
const pluginActionMatches = [...mythikAppSrc.matchAll(/name:\s*'(\w+)'/g)];
const pluginActions = pluginActionMatches.map(m => m[1]).filter(a => a !== 'navigateScreen'); // navigateScreen is internal

const allActions = [...new Set([...builtinActions, ...pluginActions])];

describe('Reference Doc — Actions (auto-extracted)', () => {
  it('found at least 15 actions in source', () => {
    expect(allActions.length).toBeGreaterThanOrEqual(15);
  });

  for (const action of allActions) {
    it(`documents action "${action}"`, () => {
      expect(
        referenceDoc.includes(action),
        `Action "${action}" exists in code but NOT in reference-doc.md`,
      ).toBe(true);
    });
  }
});

// ─── Primitives (auto-extracted from primitives/index.ts) ───

const primitivesSrc = read('packages/react/src/primitives/index.ts');
// Extract keys from PRIMITIVES object: "  'primitive-name': Component" or "  primitiveName: Component"
const primitiveMatches = [...primitivesSrc.matchAll(/^\s{2}'?([\w-]+)'?:\s+\w+/gm)];
const primitiveTypes = primitiveMatches
  .map(m => m[1])
  .filter(p => !['name', 'Component'].includes(p)); // exclude noise

describe('Reference Doc — Primitives (auto-extracted)', () => {
  it('found at least 30 primitives in source', () => {
    expect(primitiveTypes.length).toBeGreaterThanOrEqual(30);
  });

  for (const type of primitiveTypes) {
    it(`documents primitive "${type}"`, () => {
      expect(
        referenceDoc.includes(type),
        `Primitive "${type}" exists in code but NOT in reference-doc.md`,
      ).toBe(true);
    });
  }
});

// ─── Validators (auto-extracted from spec-validator.ts) ───

const validatorSrc = read('packages/core/src/security/spec-validator.ts');
const validatorSetMatch = validatorSrc.match(/knownValidators\s*=\s*new\s+Set\(\[([\s\S]*?)\]\)/);
const validatorTypes = validatorSetMatch
  ? [...validatorSetMatch[1].matchAll(/'(\w+)'/g)].map(m => m[1])
  : [];

describe('Reference Doc — Validators (auto-extracted)', () => {
  it('found at least 10 validators in source', () => {
    expect(validatorTypes.length).toBeGreaterThanOrEqual(10);
  });

  for (const validator of validatorTypes) {
    it(`documents validator "${validator}"`, () => {
      expect(
        referenceDoc.includes(validator),
        `Validator "${validator}" exists in code but NOT in reference-doc.md`,
      ).toBe(true);
    });
  }
});

// ─── Auth State Paths (auto-extracted from engine.ts) ───

const authEngineSrc = read('packages/core/src/auth/engine.ts');
// Extract paths from store.set('/auth/...', ...)  calls in writeUserToState + clearAuthState
const authPathMatches = [...authEngineSrc.matchAll(/store\.set\('(\/auth\/[^']+)'/g)];
const authStatePaths = [...new Set(authPathMatches.map(m => m[1]))];

describe('Reference Doc — Auth State Paths (auto-extracted)', () => {
  it('found at least 8 auth state paths in source', () => {
    expect(authStatePaths.length).toBeGreaterThanOrEqual(8);
  });

  for (const path of authStatePaths) {
    it(`documents auth state path "${path}"`, () => {
      expect(
        referenceDoc.includes(path),
        `Auth state path "${path}" is written by AuthEngine but NOT in reference-doc.md`,
      ).toBe(true);
    });
  }
});

// ─── $auth Blocked Fields (auto-extracted from auth handler) ───

const authHandlerSrc = read('packages/core/src/expressions/handlers/auth.ts');
const blockedSetMatch = authHandlerSrc.match(/BLOCKED_FIELDS\s*=\s*new\s+Set\(\[([\s\S]*?)\]\)/);
const blockedFields = blockedSetMatch
  ? [...blockedSetMatch[1].matchAll(/'(\w+)'/g)].map(m => m[1])
  : [];

describe('Reference Doc — $auth Blocked Fields (auto-extracted)', () => {
  it('found at least 5 blocked fields in source', () => {
    expect(blockedFields.length).toBeGreaterThanOrEqual(5);
  });

  for (const field of blockedFields) {
    it(`documents blocked field "${field}"`, () => {
      expect(
        referenceDoc.includes(field),
        `Blocked field "${field}" is in $auth handler blocklist but NOT in reference-doc.md`,
      ).toBe(true);
    });
  }
});

// ─── Required Sections ───

const REQUIRED_SECTIONS = [
  '## Expression Types',
  '## Available Primitives',
  '## Actions',
  '## Authentication',
  '### Fetch Interceptors',
  '### Action Middleware',
  '### Session Persistence',
  '### Cross-Tab Synchronization',
  '### Security Guarantees',
  'Form Validation',
];

describe('Reference Doc — Required Sections', () => {
  for (const marker of REQUIRED_SECTIONS) {
    it(`has section "${marker}"`, () => {
      expect(
        referenceDoc.includes(marker),
        `Required section "${marker}" is missing from reference-doc.md`,
      ).toBe(true);
    });
  }
});
