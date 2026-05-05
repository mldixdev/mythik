---
id: concept-dna-seeds
title: DNA seeds — 8 inputs that derive everything
kind: concept
sources: [docs/consumer/ai-context.md#deep-design-token-system, docs/consumer/reference-doc.md#dna-seeds]
---

# DNA seeds

Define 1-8 seeds in `tokens.dna`. The framework derives ALL token
categories automatically — colors via OKLCH tonal palette, shape, typography,
spacing, elevation, motion, opacity, plus auto dark mode.

## Catalog

| Seed | Type | Default | Controls |
|---|---|---|---|
| `primary` | hex | (required) | Base color → 13-stop OKLCH tonal palette |
| `harmony` | enum | `complementary` | How accent relates to primary: `complementary` (180°), `analogous` (50°), `triadic` (120°), `split-complementary` (150°) |
| `accent` | hex (optional) | derived | Explicit accent (skips harmony) |
| `neutral` | enum | `natural` | `warm` (amber 55°), `cool` (blue 250°), `natural` (primary hue). Chroma 0.025 (natural) / 0.035 (warm/cool) |
| `roundness` | 0–1 | 0.5 | Shape: 0=sharp/brutalist → 1=pill/playful |
| `density` | 0–1 | 0.5 | Spacing: 0=airy → 1=compact |
| `depth` | 0–1 | 0.5 | Shadows: 0=flat → 1=elevated |
| `motion` | enum | `gentle` | `fluid`, `snappy`, `gentle`, `energetic` — animation personality |
| `formality` | 0–1 | 0.5 | Typography (5 font tiers + continuous letterSpacing/lineHeight/bold weight) |

## Examples

Minimal:
```json
"tokens": { "dna": { "primary": "#0D9488" } }
```

Full personality:
```json
"tokens": { "dna": {
  "primary": "#0D9488",
  "harmony": "analogous",
  "roundness": 0.7,
  "density": 0.5,
  "depth": 0.6,
  "motion": "fluid",
  "formality": 0.3
}}
```

## Formality drives 5 font tiers

| Range | Body | Heading |
|---|---|---|
| 0.0 | Inter | Inter |
| 0.25 | Space Grotesk | Space Grotesk |
| 0.5 | Source Sans 3 | DM Sans |
| 0.75 | Lora | Lora |
| 1.0 | Merriweather | Playfair Display |

Plus continuous: `letterSpacing` (0 → 0.03em), `headingLetterSpacing`
(0 → -0.02em), `lineHeight` ratio (1.45 → 1.6), bold weight (700 → 800).

## Primary preserved as-is

`deriveDna` uses `seed.primary` directly as `colors.primary` (the exact
hex). Variants derived via relative OKLCH lightness: `primaryLight` =
L+15%, `primaryDark` = L-20%. Tonal palette still generated for dark mode
+ neutrals (rule 164).

## Related concepts

- [[@concept-token-system]]
- [[@concept-token-categories]]
- [[@concept-auto-dark-mode]]
- [[@action-update-tokens]] — runtime DNA changes
- [[@concept-cli-tokens-inspect]] — `mythik tokens` CLI

## Sources (raw)

- `docs/consumer/ai-context.md § Deep Design Token System → DNA Seed`
- `docs/consumer/reference-doc.md § DNA Seeds`
