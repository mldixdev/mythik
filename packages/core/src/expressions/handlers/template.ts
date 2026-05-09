import type { ExpressionHandlerDefinition, ResolverContext } from '../../types.js';
import { resolveLetBindingPath } from './let.js';

// Matches both ${/state/path} and ${localBinding}
const INTERPOLATION_REGEX = /\$\{([^}]+)\}/g;

export const templateHandler: ExpressionHandlerDefinition = {
  key: '$template',
  resolve(expr: Record<string, unknown>, context: ResolverContext): unknown {
    const template = expr.$template as string;

    return template.replace(INTERPOLATION_REGEX, (_match, ref: string) => {
      let value: unknown;

      if (ref.startsWith('/')) {
        // State path: ${/user/name}
        value = context.getState(ref);
      } else {
        // $let binding: ${age}
        value = resolveLetBindingPath(context.letBindings, ref).value;
      }

      if (value === null || value === undefined) return '';
      return String(value);
    });
  },
};
