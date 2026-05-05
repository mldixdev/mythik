import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';

/**
 * $platform resolves values based on current platform (web, ios, android).
 * The platform is set by useDeviceContext on both web and React Native.
 *
 * "native" is an alias that matches any non-web platform (ios, android).
 * Specific platform keys (ios, android) take priority over the "native" alias.
 *
 * Usage: { "$platform": { "web": "blur(24px)", "native": null } }
 *        { "$platform": { "web": "layout-web", "native": "layout-native" } }
 */
export const platformHandler: ExpressionHandlerDefinition = {
  key: '$platform',
  resolve(expr: Record<string, unknown>, context: ResolverContext, resolveFn?: ResolveFn): unknown {
    const platformValues = expr.$platform as Record<string, unknown>;
    if (!platformValues || typeof platformValues !== 'object' || Array.isArray(platformValues)) {
      return undefined;
    }

    const platform = context.getState('/ui/device/platform') as string | undefined;
    if (!platform) return undefined;

    // Specific platform key takes priority
    let value: unknown;
    if (platform in platformValues) {
      value = platformValues[platform];
    } else if (platform !== 'web' && 'native' in platformValues) {
      // "native" alias matches any non-web platform (ios, android, etc.)
      value = platformValues.native;
    } else {
      return undefined;
    }

    // Resolve nested expressions if resolveFn is provided
    return resolveFn ? resolveFn(value) : value;
  },
};
