// Coerce a `T | T[] | null | undefined` union into `T[]`.
//
// Central helper — extracted after plan 3 Task 11 review (M1): four animation
// hooks had identical copies of this function (web + RN × Element + Shape).
// Centralizing here prevents silent drift as the framework evolves (e.g., if
// we ever need to coerce Sets / iterables, the change lands once).
//
// Pure function, zero deps, cross-platform.

export function toArray<T>(val: T | T[] | null | undefined): T[] {
  if (val === null || val === undefined) return [];
  return Array.isArray(val) ? val : [val];
}
