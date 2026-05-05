import type { AppSpec } from 'mythik';

export interface NavigatorScreenConfig {
  id: string;
  title: string;
  icon?: string;
  headerShown?: boolean;
  headerStyle?: Record<string, unknown>;
}

export interface NavigatorConfig {
  type: 'tabs' | 'drawer' | 'stack';
  screens: NavigatorScreenConfig[];
}

/**
 * Convert AppSpec navigation config to React Navigation structure.
 * Maps Mythik navigation types to React Navigation navigator types:
 * - 'tabs' → BottomTabNavigator
 * - 'sidebar' → DrawerNavigator
 * - 'drawer' → DrawerNavigator
 * - default → StackNavigator
 */
export function createNavigatorConfig(appSpec: AppSpec): NavigatorConfig {
  const nav = appSpec.navigation;
  const type = nav.type === 'sidebar' ? 'drawer' : (nav.type ?? 'tabs');

  const menuItems = nav.menu ?? Object.keys(appSpec.screens);

  const screens: NavigatorScreenConfig[] = menuItems.map((id) => {
    const screenDef = appSpec.screens[id];
    return {
      id,
      title: screenDef?.label ?? id,
      icon: screenDef?.icon,
      headerShown: true,
    };
  });

  return { type: type as NavigatorConfig['type'], screens };
}
