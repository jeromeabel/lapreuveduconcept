# 003b — Responsive sizes & script alignment

## Problem

- `ComicImage` has no `sizes` attribute → browser assumes 100vw, over-fetches large variants
- Script resizes pages to 640w → too small for 2x retina on desktop (needs ~1248px)
- Mismatch between source dimensions and rendered layout

## Layout analysis

| Breakpoint | Columns | CSS width per image | 2x retina |
|---|---|---|---|
| < 768px (mobile) | 1 | 100vw - 32px | ~860px (phone 430px @2x) |
| ≥ 768px (desktop) | 2 | ~624px | ~1248px |

## Changes

### 1. `src/components/ComicImage.astro`

Add `sizes` and `width` props to `<Picture>`:

```
sizes="(min-width: 768px) 624px, calc(100vw - 2rem)"
width={1280}
```

### 2. `scripts/optimize-images.js`

Update page resize config from 640w → **1280w**:

```js
"001/jeromeabel-creativecommons-by-nc-leconceptdelapreuve-001-p1.png": { width: 1280, quality: 85, category: "page" },
"001/jeromeabel-creativecommons-by-nc-leconceptdelapreuve-001-p2.png": { width: 1280, quality: 85, category: "page" },
```

### 3. `specs/003-image-optimization/plan.md`

Update the image optimization targets table to reflect 1280w for pages.

## Acceptance criteria

- [ ] `<Picture>` outputs a `sizes` attribute matching the 2-column grid layout
- [ ] Script resizes pages to 1280w (sufficient for 2x retina)
- [ ] `pnpm build` succeeds
- [ ] `pnpm optimize-images:dry` shows 1280w for pages
