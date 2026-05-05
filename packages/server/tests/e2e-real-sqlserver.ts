/**
 * Manual E2E smoke test against a real SQL Server database.
 *
 * This script is intentionally opt-in and environment-driven. Do not hardcode
 * private database names, credentials, table names, or production data here.
 *
 * Required:
 *   MYTHIK_E2E_SQLSERVER=1
 *   MYTHIK_E2E_SQLSERVER_HOST=<host>
 *   MYTHIK_E2E_SQLSERVER_DATABASE=<database>
 *   MYTHIK_E2E_SQLSERVER_USER=<user>
 *   MYTHIK_E2E_SQLSERVER_PASSWORD=<password>
 *   MYTHIK_E2E_SQLSERVER_TABLE=<table>
 *
 * Optional:
 *   MYTHIK_E2E_SQLSERVER_ID_COLUMN=id
 *   MYTHIK_E2E_SQLSERVER_LABEL_COLUMN=name
 *   MYTHIK_E2E_SQLSERVER_PORT=3099
 *
 * Run:
 *   npx tsx packages/server/tests/e2e-real-sqlserver.ts
 */

import { createServer } from '../src/index.js';
import type { ApiSpec } from '../src/types.js';

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function assertSafeIdentifier(value: string, label: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${label} must be a simple SQL identifier. Got: ${value}`);
  }
  return value;
}

function createManualE2ESpec(): ApiSpec {
  const table = assertSafeIdentifier(readRequiredEnv('MYTHIK_E2E_SQLSERVER_TABLE'), 'MYTHIK_E2E_SQLSERVER_TABLE');
  const idColumn = assertSafeIdentifier(readEnv('MYTHIK_E2E_SQLSERVER_ID_COLUMN', 'id'), 'MYTHIK_E2E_SQLSERVER_ID_COLUMN');
  const labelColumn = assertSafeIdentifier(readEnv('MYTHIK_E2E_SQLSERVER_LABEL_COLUMN', 'name'), 'MYTHIK_E2E_SQLSERVER_LABEL_COLUMN');

  return {
    type: 'api',
    name: 'Manual SQL Server E2E',
    connection: {
      server: readRequiredEnv('MYTHIK_E2E_SQLSERVER_HOST'),
      database: readRequiredEnv('MYTHIK_E2E_SQLSERVER_DATABASE'),
      user: readRequiredEnv('MYTHIK_E2E_SQLSERVER_USER'),
      password: readRequiredEnv('MYTHIK_E2E_SQLSERVER_PASSWORD'),
      trustServerCertificate: process.env.MYTHIK_E2E_SQLSERVER_TRUST_CERT !== 'false',
    },
    catalogs: {
      sampleRows: {
        from: table,
        value: idColumn,
        label: labelColumn,
        orderBy: labelColumn,
      },
    },
    endpoints: {
      sampleList: {
        path: '/api/sample',
        query: `SELECT ${idColumn} as id, ${labelColumn} as label FROM ${table} ORDER BY ${labelColumn}`,
        pagination: 'offset',
        params: {
          pageSize: { type: 'int', default: 10, max: 50 },
        },
        totals: ['COUNT:*'],
      },
      sampleStats: {
        path: '/api/sample/stats',
        query: `SELECT COUNT(*) as totalRows FROM ${table}`,
      },
    },
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    console.log(`  PASS ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

async function run(): Promise<void> {
  if (process.env.MYTHIK_E2E_SQLSERVER !== '1') {
    console.log('Skipping manual SQL Server E2E. Set MYTHIK_E2E_SQLSERVER=1 to run it.');
    return;
  }

  const spec = createManualE2ESpec();
  const server = createServer({ spec });
  const port = Number(process.env.MYTHIK_E2E_SQLSERVER_PORT || '3099');

  try {
    await server.start(port);
    const base = `http://localhost:${port}`;

    console.log('\n--- Catalogs ---');
    const catalogRes = await fetch(`${base}/api/catalogs/sampleRows`);
    const catalog = await catalogRes.json();
    assert(catalogRes.ok, 'Static server returns sample catalog');
    assert(Array.isArray(catalog), `Sample catalog is an array (got ${typeof catalog})`);

    console.log('\n--- Endpoints ---');
    const listRes = await fetch(`${base}/api/sample?page=0&pageSize=10`);
    const list = await listRes.json();
    assert(listRes.ok, 'Sample list endpoint returns 200');
    assert(Array.isArray(list.data), 'Sample list response includes data array');
    assert(typeof list.pageSize === 'number', 'Sample list response includes pageSize');

    const statsRes = await fetch(`${base}/api/sample/stats`);
    const stats = await statsRes.json();
    assert(statsRes.ok, 'Sample stats endpoint returns 200');
    assert(Array.isArray(stats.data) && stats.data.length === 1, 'Sample stats returns one row');

    console.log(`\n${passed} passed, ${failed} failed`);
  } catch (error) {
    console.error('\nFATAL:', error);
    failed++;
  } finally {
    await server.stop();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
