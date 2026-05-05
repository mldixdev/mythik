/**
 * Topological sort for derive paths based on their dependency graph.
 * Throws on circular dependencies.
 *
 * Used by:
 * - DeriveEngine.mount (evaluator.ts) — order of evaluation
 * - spec-validator (Item E) — load-time cycle detection
 */
export function topologicalSort(
  derive: Record<string, unknown>,
  depsMap: Map<string, Set<string>>,
): string[] {
  const derivePaths = new Set(Object.keys(derive));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: string[] = [];

  function visit(path: string): void {
    if (visited.has(path)) return;
    if (visiting.has(path)) {
      throw new Error(`Circular dependency detected in derive: "${path}" depends on itself (directly or indirectly)`);
    }

    visiting.add(path);

    const deps = depsMap.get(path) ?? new Set();
    for (const dep of deps) {
      if (derivePaths.has(dep)) {
        visit(dep);
      }
    }

    visiting.delete(path);
    visited.add(path);
    sorted.push(path);
  }

  for (const path of derivePaths) {
    visit(path);
  }

  return sorted;
}
