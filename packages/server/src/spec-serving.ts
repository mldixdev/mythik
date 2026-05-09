import type { SqlDriver } from 'mythik/server';
import { assertValidIdentifier } from './validation/identifier-guard.js';

export async function checkScreensTable(driver: SqlDriver, tableName: string): Promise<boolean> {
  try {
    assertValidIdentifier(tableName, 'specServing.table');
    return await driver.tableExists(tableName);
  } catch {
    return false;
  }
}

export function buildSpecServingRoutes(driver: SqlDriver, tableName: string) {
  assertValidIdentifier(tableName, 'specServing.table');
  const table = quoteIdentifierPath(driver, tableName);

  async function loadScreen(id: string): Promise<unknown> {
    const result = await driver.query(
      `SELECT ${driver.quoteIdent('spec')} FROM ${table} WHERE ${driver.quoteIdent('id')} = @id`,
      { id },
    );

    if (!result[0]) return null;

    const raw = result[0].spec;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Never serve api-specs to the browser — they contain table names, SQL, auth config
    if (parsed && typeof parsed === 'object' && (parsed as Record<string, unknown>).type === 'api') {
      return null;
    }

    return parsed;
  }

  async function loadApp(id: string): Promise<unknown> {
    const spec = await loadScreen(id);
    if (!spec || typeof spec !== 'object') return null;
    if ((spec as Record<string, unknown>).type !== 'app') return null;
    return spec;
  }

  return { loadScreen, loadApp };
}

export async function discoverAppSpecs(
  driver: SqlDriver,
  tableName: string,
): Promise<Array<{ id: string; loginScreen: string | null }>> {
  try {
    assertValidIdentifier(tableName, 'specServing.table');
    const table = quoteIdentifierPath(driver, tableName);
    const rows = await driver.query<{ id: string; spec: unknown }>(
      `SELECT ${driver.quoteIdent('id')}, ${driver.quoteIdent('spec')} FROM ${table}`,
    );

    const appSpecs: Array<{ id: string; loginScreen: string | null }> = [];
    for (const row of rows) {
      const spec = typeof row.spec === 'string' ? JSON.parse(row.spec) : row.spec;
      if (spec && typeof spec === 'object' && (spec as Record<string, unknown>).type === 'app') {
        const navigation = (spec as Record<string, unknown>).navigation as Record<string, unknown> | undefined;
        const auth = navigation?.auth as Record<string, unknown> | undefined;
        appSpecs.push({
          id: row.id,
          loginScreen: typeof auth?.loginScreen === 'string' ? auth.loginScreen : null,
        });
      }
    }
    return appSpecs;
  } catch {
    return [];
  }
}

function quoteIdentifierPath(driver: SqlDriver, identifier: string): string {
  return identifier.includes('.')
    ? driver.quoteQualified(...identifier.split('.'))
    : driver.quoteIdent(identifier);
}

/** Strips authorization-sensitive fields from AppSpec for unauthenticated responses. */
export function stripSensitiveFields(appSpec: Record<string, unknown>): Record<string, unknown> {
  const stripped = structuredClone(appSpec);
  const nav = stripped.navigation as Record<string, unknown> | undefined;
  if (!nav) return stripped;

  const auth = nav.auth as Record<string, unknown> | undefined;
  if (auth) {
    delete auth.roleAccess;
    delete auth.protectedScreens;
  }

  return stripped;
}
