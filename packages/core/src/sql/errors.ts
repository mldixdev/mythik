export interface SqlDriverErrorOptions {
  code: string;
  dialect?: string;
  cause?: unknown;
}

export class SqlDriverError extends Error {
  readonly code: string;
  readonly dialect?: string;
  override readonly cause?: unknown;

  constructor(message: string, options: SqlDriverErrorOptions) {
    super(message);
    this.name = 'SqlDriverError';
    this.code = options.code;
    this.dialect = options.dialect;
    this.cause = options.cause;
  }
}
