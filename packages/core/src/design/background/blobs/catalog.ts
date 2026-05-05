// Blob v2 — curated SVG shape catalog (plan 3 Task 5).
//
// Five hand-curated organic shapes + a perfect circle. `custom-svg` is a
// sentinel value for the `BlobShapeName` union; it does NOT appear in this
// catalog map — callers passing `shape: 'custom-svg'` must supply their own
// path + viewBox (sanitized by resolveBlobLayer).
//
// Coordinate system: every curated shape uses the canonical `0 0 100 100`
// viewBox so that `size` (px/%) scales predictably. Paths always close with
// `Z` to guarantee fill behavior is well-defined regardless of the renderer.
//
// Aesthetic intent (informal — no literal copies of third-party assets):
//   organic-1 → balanced rounded blob (four convex cubic segments)
//   organic-2 → elongated diagonal blob (offset center of mass)
//   organic-3 → asymmetric multi-lobe (all-cubic to avoid T-reflection cusps)
//   organic-4 → horizontal flowing ribbon
//   organic-5 → sharply asymmetric with one extended lobe
//
// Adding a new curated shape requires:
//   1. Adding the member to `BlobShapeName` (union)
//   2. Adding the catalog entry (viewBox + path)
//   3. The type system enforces the map key matches `BlobShapeName` minus 'custom-svg'

export type BlobShapeName =
  | 'organic-1'
  | 'organic-2'
  | 'organic-3'
  | 'organic-4'
  | 'organic-5'
  | 'circle'
  | 'custom-svg';

/** Names of catalog-backed shapes (excludes the user-provided `custom-svg`). */
export type CuratedBlobName = Exclude<BlobShapeName, 'custom-svg'>;

export interface BlobShapeDef {
  name: BlobShapeName;
  viewBox: string;
  path: string;
}

export const BLOB_CATALOG: Record<CuratedBlobName, BlobShapeDef> = {
  'organic-1': {
    name: 'organic-1',
    viewBox: '0 0 100 100',
    path: 'M50,10 C70,10 90,25 90,50 C90,70 75,90 55,90 C30,90 10,75 10,50 C10,28 28,10 50,10 Z',
  },
  'organic-2': {
    name: 'organic-2',
    viewBox: '0 0 100 100',
    path: 'M20,25 C35,10 65,15 80,30 C90,45 85,65 70,80 C55,95 30,90 15,75 C5,55 10,40 20,25 Z',
  },
  // All-cubic path — avoids T-reflection cusp at the closure point that the
  // previous Q+T variant risked producing. Asymmetric bounding box still
  // yields a distinctive multi-lobe silhouette.
  'organic-3': {
    name: 'organic-3',
    viewBox: '0 0 100 100',
    path: 'M60,12 C82,18 92,36 84,58 C78,82 50,92 35,82 C18,72 12,50 22,34 C30,22 46,8 60,12 Z',
  },
  'organic-4': {
    name: 'organic-4',
    viewBox: '0 0 100 100',
    path: 'M10,45 C25,25 45,35 55,50 C65,65 85,55 90,70 C75,90 45,85 30,75 C15,70 5,60 10,45 Z',
  },
  // Sharply asymmetric — one extended lower-right lobe reaching to x=95,
  // compensated by an inset at upper-right (x=62). Intentionally reads as a
  // distinct silhouette from organic-1 (which is near-convex and balanced).
  'organic-5': {
    name: 'organic-5',
    viewBox: '0 0 100 100',
    path: 'M18,20 C40,8 62,16 70,30 C58,42 70,58 95,68 C82,88 50,90 32,78 C12,66 5,42 18,20 Z',
  },
  // Single-subpath canonical circle. M moves to the leftmost point, two
  // relative arcs each trace 180°; Z is meaningful (returns to M).
  circle: {
    name: 'circle',
    viewBox: '0 0 100 100',
    path: 'M5,50 a45,45 0 1,0 90,0 a45,45 0 1,0 -90,0 Z',
  },
};
