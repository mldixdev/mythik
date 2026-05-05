import type { PermissionConfig } from '../types.js';

export type PermissionResult = 'visible-editable' | 'visible-readonly' | 'hidden';

/**
 * Evaluate field-level permissions for a given role.
 *
 * Logic:
 * 1. If no permission config → visible and editable (default)
 * 2. If role is in editable → visible and editable
 * 3. If role is in readonly → visible but readonly
 * 4. If role is in visible (but not editable/readonly) → visible and editable
 * 5. If visible is defined and role is NOT in it → hidden
 * 6. Otherwise → hidden
 */
export function evaluatePermission(
  permission: PermissionConfig | undefined,
  role: string | undefined,
): PermissionResult {
  if (!permission) return 'visible-editable';
  if (!role) return 'hidden';

  // Check editable first (most permissive)
  if (permission.editable?.includes(role)) return 'visible-editable';

  // Check readonly
  if (permission.readonly?.includes(role)) return 'visible-readonly';

  // Check visible (if specified, acts as allowlist)
  if (permission.visible) {
    if (permission.visible.includes(role)) return 'visible-editable';
    return 'hidden';
  }

  // No visible array defined — default visible
  return 'visible-editable';
}
