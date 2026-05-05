import type { RenderNode } from '../types.js';

export type PrimitiveRenderer = (
  props: Record<string, unknown>,
  children: RenderNode[],
) => RenderNode;

export interface PrimitiveRegistry {
  register: (type: string, renderer: PrimitiveRenderer) => void;
  has: (type: string) => boolean;
  get: (type: string) => PrimitiveRenderer;
  keys: () => string[];
}

export function createPrimitiveRegistry(): PrimitiveRegistry {
  const renderers = new Map<string, PrimitiveRenderer>();

  return {
    register(type: string, renderer: PrimitiveRenderer): void {
      renderers.set(type, renderer);
    },
    has(type: string): boolean {
      return renderers.has(type);
    },
    get(type: string): PrimitiveRenderer {
      const renderer = renderers.get(type);
      if (!renderer) {
        throw new Error(`No primitive registered for type "${type}"`);
      }
      return renderer;
    },
    keys(): string[] {
      return Array.from(renderers.keys());
    },
  };
}
