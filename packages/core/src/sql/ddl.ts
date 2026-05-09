import type { SqlDialect } from './types.js';

export type SqlStoreTable = 'screens' | 'screen_versions' | 'screen_environments';

type SqlStoreDdlByDialect = Record<SqlDialect, Record<SqlStoreTable, string>>;

export const SQL_STORE_DDL: SqlStoreDdlByDialect = {
  sqlserver: {
    screens: `IF OBJECT_ID(N'screens', N'U') IS NULL
CREATE TABLE [screens] (
  [id] NVARCHAR(255) NOT NULL PRIMARY KEY,
  [name] NVARCHAR(255) NOT NULL,
  [spec] NVARCHAR(MAX) NOT NULL,
  [version] INT NOT NULL DEFAULT 1,
  [is_active] BIT NOT NULL DEFAULT 1,
  [updated_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
)`,
    screen_versions: `IF OBJECT_ID(N'screen_versions', N'U') IS NULL
CREATE TABLE [screen_versions] (
  [id] BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  [screen_id] NVARCHAR(255) NOT NULL,
  [version] INT NOT NULL,
  [is_snapshot] BIT NOT NULL,
  [spec] NVARCHAR(MAX) NULL,
  [patches] NVARCHAR(MAX) NULL,
  [author] NVARCHAR(255) NOT NULL,
  [source_type] NVARCHAR(64) NOT NULL,
  [description] NVARCHAR(MAX) NULL,
  [created_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT [UQ_screen_versions_screen_version] UNIQUE ([screen_id], [version])
)`,
    screen_environments: `IF OBJECT_ID(N'screen_environments', N'U') IS NULL
CREATE TABLE [screen_environments] (
  [screen_id] NVARCHAR(255) NOT NULL,
  [environment] NVARCHAR(64) NOT NULL,
  [version] INT NOT NULL,
  [promoted_at] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  [promoted_by] NVARCHAR(255) NOT NULL,
  CONSTRAINT [PK_screen_environments] PRIMARY KEY ([screen_id], [environment])
)`,
  },
  postgres: {
    screens: `CREATE TABLE IF NOT EXISTS screens (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  spec JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
    screen_versions: `CREATE TABLE IF NOT EXISTS screen_versions (
  id BIGSERIAL PRIMARY KEY,
  screen_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  is_snapshot BOOLEAN NOT NULL,
  spec JSONB NULL,
  patches JSONB NULL,
  author TEXT NOT NULL,
  source_type TEXT NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_screen_versions_screen_version UNIQUE (screen_id, version)
)`,
    screen_environments: `CREATE TABLE IF NOT EXISTS screen_environments (
  screen_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  version INTEGER NOT NULL,
  promoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_by TEXT NOT NULL,
  CONSTRAINT pk_screen_environments PRIMARY KEY (screen_id, environment)
)`,
  },
  mysql: {
    screens: `CREATE TABLE IF NOT EXISTS screens (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  spec JSON NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
)`,
    screen_versions: `CREATE TABLE IF NOT EXISTS screen_versions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  screen_id VARCHAR(255) NOT NULL,
  version INT NOT NULL,
  is_snapshot TINYINT(1) NOT NULL,
  spec JSON NULL,
  patches JSON NULL,
  author VARCHAR(255) NOT NULL,
  source_type VARCHAR(64) NOT NULL,
  description TEXT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT uq_screen_versions_screen_version UNIQUE (screen_id, version)
)`,
    screen_environments: `CREATE TABLE IF NOT EXISTS screen_environments (
  screen_id VARCHAR(255) NOT NULL,
  environment VARCHAR(64) NOT NULL,
  version INT NOT NULL,
  promoted_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  promoted_by VARCHAR(255) NOT NULL,
  CONSTRAINT pk_screen_environments PRIMARY KEY (screen_id, environment)
)`,
  },
  sqlite: {
    screens: `CREATE TABLE IF NOT EXISTS screens (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  spec TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
    screen_versions: `CREATE TABLE IF NOT EXISTS screen_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  screen_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  is_snapshot INTEGER NOT NULL,
  spec TEXT NULL,
  patches TEXT NULL,
  author TEXT NOT NULL,
  source_type TEXT NOT NULL,
  description TEXT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_screen_versions_screen_version UNIQUE (screen_id, version)
)`,
    screen_environments: `CREATE TABLE IF NOT EXISTS screen_environments (
  screen_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  version INTEGER NOT NULL,
  promoted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  promoted_by TEXT NOT NULL,
  CONSTRAINT pk_screen_environments PRIMARY KEY (screen_id, environment)
)`,
  },
};

export function getSqlStoreDdl(dialect: SqlDialect): string[] {
  const ddl = SQL_STORE_DDL[dialect];
  return [ddl.screens, ddl.screen_versions, ddl.screen_environments];
}
