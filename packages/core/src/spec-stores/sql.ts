import type { SpecStore } from '../spec-engine/types.js';
import { assertValidIdentifier } from '../security/identifier-guard.js';
import type { SqlDriver } from '../sql/index.js';

export interface SqlSpecStoreConfig {
  driver: SqlDriver;
  /** Table name for spec storage. Default: 'screens' */
  table?: string;
  /** Close the underlying driver when close() is called. Default: false */
  closeDriver?: boolean;
}

function parseStoredJson(value: unknown): unknown {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function nowTimestamp(): Date {
  return new Date();
}

export class SqlSpecStore implements SpecStore {
  protected readonly driver: SqlDriver;
  protected readonly tableName: string;
  private readonly closeDriver: boolean;

  constructor(config: SqlSpecStoreConfig) {
    this.driver = config.driver;
    this.tableName = config.table ?? 'screens';
    this.closeDriver = config.closeDriver ?? false;
    assertValidIdentifier(this.tableName, 'SqlSpecStore.table');
  }

  async load(id: string): Promise<unknown> {
    const rows = await this.driver.query<{ spec: unknown }>(
      `SELECT spec FROM ${this.driver.quoteIdent(this.tableName)} WHERE id = @id`,
      { id },
    );

    if (!rows[0]) {
      throw new Error(`Spec "${id}" not found`);
    }

    return parseStoredJson(rows[0].spec);
  }

  async save(id: string, doc: unknown): Promise<void> {
    const specJson = JSON.stringify(doc);
    const updatedAt = nowTimestamp();

    await this.driver.transaction(async (tx) => {
      const existing = await tx.query<{ version: number }>(
        `SELECT version FROM ${this.driver.quoteIdent(this.tableName)} WHERE id = @id`,
        { id },
      );

      if (existing[0]) {
        const nextVersion = Number(existing[0].version ?? 0) + 1;
        await tx.exec(
          this.driver.buildUpdateReturning(
            this.tableName,
            {
              spec: specJson,
              version: nextVersion,
              updated_at: updatedAt,
            },
            { sql: 'id = @id', params: { id } },
            ['id'],
          ),
        );
        return;
      }

      await tx.exec(
        this.driver.buildInsertReturning(
          this.tableName,
          {
            id,
            name: id,
            spec: specJson,
            version: 1,
            is_active: true,
            updated_at: updatedAt,
          },
          ['id'],
        ),
      );
    });
  }

  async list(): Promise<string[]> {
    const rows = await this.driver.query<{ id: string }>(
      `SELECT id FROM ${this.driver.quoteIdent(this.tableName)} ORDER BY id`,
    );
    return rows.map((row) => row.id);
  }

  async delete(id: string): Promise<void> {
    const result = await this.driver.exec(this.driver.buildDelete(this.tableName, { sql: 'id = @id', params: { id } }));
    if (result.affectedRows === 0) {
      throw new Error(`Spec "${id}" not found`);
    }
  }

  async close(): Promise<void> {
    if (this.closeDriver) {
      await this.driver.close();
    }
  }
}
