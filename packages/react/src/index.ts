// mythik-react — public API
export { MythikRenderer } from './MythikRenderer.js';
export { registerReactPrimitives, PRIMITIVES } from './primitives/index.js';
export { Box, Text, Image, Icon, Stack, Grid, Scroll, Divider, Spacer } from './primitives/index.js';
export { Input, Textarea, Select, Checkbox, Toggle, Slider } from './primitives/index.js';
export { Button, Touchable, List } from './primitives/index.js';
export { MythikApp, createAuthSpecStore } from './MythikApp.js';
export { AppContext, useAppContext } from './app-context.js';

// Re-export auth providers for convenience (scaffolding imports from mythik-react)
export { createSupabaseAuthProvider, createCustomJWTProvider, createMockAuthProvider } from 'mythik';
export type { AuthProvider, AuthUser, AuthResult, AuthEvent } from 'mythik';
