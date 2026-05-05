import sql, { type ConnectionPool } from 'mssql';
import { assertValidIdentifier } from './validation/identifier-guard.js';

export async function checkScreensTable(pool: ConnectionPool, tableName: string): Promise<boolean> {
  try {
    assertValidIdentifier(tableName, 'specServing.table');
    const result = await pool.request()
      .input('tableName', sql.NVarChar, tableName)
      .query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tableName');
    return result.recordset.length > 0;
  } catch {
    return false;
  }
}

export function buildSpecServingRoutes(pool: ConnectionPool, tableName: string) {
  async function loadScreen(id: string): Promise<unknown> {
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query(`SELECT spec FROM [${tableName}] WHERE id = @id`);

    if (!result.recordset[0]) return null;

    const raw = result.recordset[0].spec;
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
