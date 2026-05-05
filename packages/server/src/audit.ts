export interface AuditConfig {
  /** Column name for the user who created the record. Value: req.user.username */
  createdBy?: string;
  /** Column name for creation timestamp. */
  createdAt?: string;
  /** Column name for the user who last modified the record. Value: req.user.username */
  updatedBy?: string;
  /** Column name for last modification timestamp. */
  updatedAt?: string;
  /** IANA timezone for timestamps (e.g., "America/El_Salvador"). Default: UTC. */
  timezone?: string;
}

/**
 * Returns current timestamp in the configured timezone as a Date object.
 * When timezone is specified, creates a Date adjusted to that timezone
 * so SQL Server datetime columns store the correct local time.
 */
function getTimestamp(timezone?: string): Date {
  if (!timezone) return new Date();

  // Format current time in target timezone and parse back to Date
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? '0';

  // Use Date.UTC so mssql sends the value as-is to SQL Server (no local timezone conversion)
  return new Date(Date.UTC(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second')),
  ));
}

/**
 * Injects audit fields into a CRUD fields object before query building.
 * Mutates `fields` in place. Audit values override any client-sent values.
 */
export function injectAuditFields(
  fields: Record<string, unknown>,
  audit: AuditConfig,
  username: string | null,
  operation: 'insert' | 'update',
): void {
  const now = getTimestamp(audit.timezone);

  if (operation === 'insert') {
    if (audit.createdBy && username) fields[audit.createdBy] = username;
    if (audit.createdAt) fields[audit.createdAt] = now;
  }

  if (audit.updatedBy && username) fields[audit.updatedBy] = username;
  if (audit.updatedAt) fields[audit.updatedAt] = now;
}
