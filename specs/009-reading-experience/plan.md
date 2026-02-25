# 009 — Improving Reading Comic Strip Experience

> Status: **in-progress**

## Problem

The current reading wall (`index.astro`) is a vertical feed of comic cards. On desktop, each comic displays two panels side-by-side inside a bordered card with opacity-reveal transitions and a scroll-helper arrow between comics. On mobile, panels stack vertically, creating long scroll distances per comic with weak separation between strips.

The goal is to **explore alternative reading experiences** through separate prototype pages, then evaluate which approach best balances immersion, reading rhythm, and usability.

## Approach

Build **3 prototype routes**, each implementing a distinct UX pattern. The current `index.astro` stays untouched as the baseline/control.

| Route | Pattern | Key technique |
|-------|---------|---------------|
| `/reading/snap` | Full-viewport snap | CSS `scroll-snap-type: y mandatory` |
| `/reading/slider` | Horizontal carousel | CSS scroll-snap-x + nav buttons |
| `/reading/magazine` | Vertical feed + parallax | CSS `scroll-snap-type: y proximity` + sticky stacking |

All prototypes load the full comic collection with real data.

## Prototype 1: Snap (`/reading/snap`)

Each comic occupies the full viewport height. Vertical scroll snaps lock one comic at a time.

### Desktop
- Container: `height: 100dvh; overflow-y: auto; scroll-snap-type: y mandatory`
- Each comic section: `scroll-snap-align: start; height: 100dvh` with vertically centered content
- Both panels visible side-by-side inside the section
- Action bar (vote, share, metadata) at the bottom of each section

### Mobile
- Same vertical snap between comics
- Panels use a **nested horizontal scroll-snap** (`scroll-snap-type: x mandatory`) — swipe left/right between panel 1 and panel 2
- Dot indicators show which panel is visible
- Solves the "stacked panels = too much scrolling" problem

### Interactions
- Spacebar / Arrow Down → next comic
- Swipe up → next comic
- On mobile: swipe left/right → switch panels within a comic

## Prototype 2: Slider (`/reading/slider`)

Comics are navigated horizontally, one at a time, like a digital magazine page-turner.

### Desktop
- Container: `overflow: hidden` with a sliding inner wrapper
- Each slide shows one comic with both panels side-by-side
- Prev/Next arrow buttons on screen edges
- Keyboard: Left/Right arrows to navigate
- Progress indicator: dot row or "3 / 8" counter

### Mobile
- Same horizontal navigation via touch swipe
- Panels either side-by-side (landscape) or horizontal-snap (portrait)
- Larger prev/next tap targets on screen edges

### Interactions
- Arrow keys / click arrows → prev/next comic
- Touch swipe left/right → prev/next comic
- Optional: pinch-to-zoom on panels

## Prototype 3: Magazine (`/reading/magazine`)

Keeps the familiar vertical scroll but adds snap precision, parallax depth, and a stacking card effect.

### Desktop
- Container: `scroll-snap-type: y proximity` (softer snap, allows free-scrolling but gently locks)
- Each section: `min-height: 100dvh; scroll-snap-align: start`
- Comic images have subtle parallax: `transform: translateY(calc(var(--scroll-progress) * -30px))`
- Cards use `position: sticky` to create a stacking/overlapping effect as you scroll down
- Action bar within each sticky section

### Mobile
- Same vertical scroll with proximity snap
- Panels use horizontal scroll-snap (same pattern as Snap prototype)
- Parallax disabled or reduced
- Sticky stacking still applies for visual depth

### Interactions
- Natural vertical scroll with gentle snap assist
- On mobile: swipe left/right for panels within a comic
- Parallax responds to scroll position via `IntersectionObserver` + CSS custom property

## Shared Infrastructure

### Reused components
- `ComicImage.astro` — responsive image handling (unchanged)
- `VoteButton.astro` — like/heart functionality
- `ShareActions.astro` — share/permalink actions

### New files
```
src/pages/reading/snap.astro
src/pages/reading/slider.astro
src/pages/reading/magazine.astro
src/components/reading/SnapCard.astro
src/components/reading/SliderCard.astro
src/components/reading/MagazineCard.astro
```

### No external dependencies
All prototypes use pure CSS + vanilla JS. No carousel libraries, no animation frameworks.

## Accessibility

- All prototypes respect `prefers-reduced-motion: reduce` (disable parallax, soften snap, remove transitions)
- Keyboard navigation for all three approaches (arrow keys, spacebar, tab)
- ARIA labels on navigation controls
- Focus management when navigating between comics
- Images retain existing `alt` text from content collection

## Evaluation Criteria

After building all three prototypes, evaluate against:

1. **Reading rhythm** — Does it create a natural, intentional pace?
2. **Mobile comfort** — Is the panel-to-panel and comic-to-comic navigation fluid?
3. **Content visibility** — Can users see the full art without awkward cropping or scrolling?
4. **Orientation** — Do users know where they are in the collection?
5. **Performance** — Does it stay smooth with the full collection loaded?
6. **Simplicity** — How much code complexity does it add?

## Out of scope

- Changes to the current `index.astro` (stays as baseline)
- New content schema or data changes
- Analytics integration (can be added later to the winning approach)
- Responsive breakpoint redesigns beyond panel handling
