const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
const MAX_IDENTIFIER_LENGTH = 128;

export function isValidIdentifier(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (name.length > MAX_IDENTIFIER_LENGTH) return false;
  return IDENTIFIER_REGEX.test(name);
}

export function assertValidIdentifier(name: string, context: string): void {
  if (!isValidIdentifier(name)) {
    throw new Error(`Invalid SQL identifier "${name}" in ${context} — must match ${IDENTIFIER_REGEX} and be ≤${MAX_IDENTIFIER_LENGTH} chars`);
  }
}
