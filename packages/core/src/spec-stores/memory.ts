import type { SpecStore } from '../spec-engine/types.js';

export class MemorySpecStore implements SpecStore {
  private specs: Map<string, unknown>;

  constructor(initial?: Record<string, unknown>) {
    this.specs = new Map();
    if (initial) {
      for (const [id, spec] of Object.entries(initial)) {
        this.specs.set(id, structuredClone(spec));
      }
    }
  }

  async load(screenId: string): Promise<unknown> {
    const spec = this.specs.get(screenId);
    if (!spec) {
      throw new Error(`Spec "${screenId}" not found`);
    }
    return structuredClone(spec);
  }

  async save(screenId: string, spec: unknown): Promise<void> {
    this.specs.set(screenId, structuredClone(spec));
  }

  async list(): Promise<string[]> {
    return Array.from(this.specs.keys());
  }

  async delete(screenId: string): Promise<void> {
    if (!this.specs.has(screenId)) {
      throw new Error(`Spec "${screenId}" not found`);
    }
    this.specs.delete(screenId);
  }
}
