---
id: concept-font-loading
title: Font loading — project responsibility
kind: concept
sources: [docs/consumer/ai-context.md#deep-design-token-system, docs/consumer/reference-doc.md#font-loading]
---

# Font loading

Tokens define font NAMES (e.g., `fontFamily.heading: "Playfair Display"`)
but **do NOT load fonts**. This is the project's responsibility.

## Web

Include `@font-face` declarations or a Google Fonts link:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;600&display=swap" rel="stylesheet">
```

Without loading, browser falls back to system fonts.

## React Native

Use `expo-font`:

```tsx
import { useFonts } from 'expo-font';

const [loaded] = useFonts({
  'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
  'PlayfairDisplay-Bold': require('./assets/fonts/PlayfairDisplay-Bold.ttf'),
});
```

## DNA-derived font tier names

Body: Inter, Space Grotesk, Source Sans 3, Lora, Merriweather.
Heading: Inter, Space Grotesk, DM Sans, Lora, Playfair Display.

CSS fallbacks included in resolved tokens (e.g., `'Inter', sans-serif`).

## Related concepts

- [[@concept-dna-seeds]] — `formality` chooses tier
- [[@concept-token-categories]]

## Sources (raw)

- `docs/consumer/ai-context.md § Deep Design Token System → Font loading`
- `docs/consumer/reference-doc.md § Font Loading`
