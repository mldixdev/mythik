export interface SqlDriverErrorOptions {
  code: string;
  dialect?: string;
  packageName?: string;
  installCommand?: string;
  cause?: unknown;
}

export class SqlDriverError extends Error {
  readonly code: string;
  readonly dialect?: string;
  readonly packageName?: string;
  readonly installCommand?: string;
  override readonly cause?: unknown;

  constructor(message: string, options: SqlDriverErrorOptions) {
    super(message);
    this.name = 'SqlDriverError';
    this.code = options.code;
    this.dialect = options.dialect;
    this.packageName = options.packageName;
    this.installCommand = options.installCommand;
    this.cause = options.cause;
  }
}

export function missingSqlDriverDependencyError(args: {
  label: string;
  dialect: string;
  packageName: string;
  cause?: unknown;
}): SqlDriverError {
  const installCommand = `npm install ${args.packageName}`;
  return new SqlDriverError(
    `${args.label} support requires the optional peer dependency "${args.packageName}". Install it with: ${installCommand}`,
    {
      code: 'SQL_DRIVER_DEPENDENCY_MISSING',
      dialect: args.dialect,
      packageName: args.packageName,
      installCommand,
      cause: args.cause,
    },
  );
}
