# 004 — Generate Cover Image from Pages

## Goal

Automate cover image generation from comic page images, replacing the manual export workflow.

## Interface

```bash
pnpm generate-cover 001
```

Reads page images from `src/assets/comics/{id}/`, composites them into a cover, writes to:
`src/assets/comics/{id}/jeromeabel-creativecommons-by-nc-leconceptdelapreuve-{id}-cover.png`

## Layout

Split layout optimized for OG image standard (1200×630px):

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Le concept de        ┌─────────┐  ┌─────────┐  │
│  la preuve #001       │         │  │         │  │
│                       │  page1  │  │  page2  │  │
│  « Tocards »          │         │  │         │  │
│                       │         │  │         │  │
│  Jerome Abel · CC0    └─────────┘  └─────────┘  │
│  2026-02-07                                      │
│                                                  │
└──────────────────────────────────────────────────┘
```

- Output: **1200×630px** (OG image best practice)
- White background
- Left column (380px): series name (24px bold, 2 lines), episode title (28px), credits (16px gray)
- Right column: page thumbnails scaled to fit, vertically centered
- Thin dark border (2px, dark gray) around each page
- Both text and pages are vertically centered

## Data Sources

- **Title, date**: parsed from `src/content/comics/{id}.md` frontmatter
- **Author, licence**: hardcoded ("Jerome Abel", "CC0")
- **Page images**: discovered from frontmatter `pages` array

## Tech

- **Sharp** (already a devDependency) — compositing, resizing, SVG text overlay
- Frontmatter parsing: simple regex (no extra dependencies)
- Text via SVG overlay rendered by Sharp's `composite()`

## Script Flow

1. Parse CLI arg for comic ID
2. Read and parse frontmatter from `src/content/comics/{id}.md`
3. Load page images with Sharp, get dimensions
4. Calculate layout (scale pages, compute total height)
5. Create white canvas at final dimensions
6. Composite: border SVGs + page images + title SVG + credits SVG
7. Write cover PNG

## Edge Cases

- Missing page files → exit with clear error
- Pages with different heights → top-aligned, tallest wins
- Existing cover → overwrite (that's the purpose)

## Package.json Script

```json
"generate-cover": "node scripts/generate-cover.js"
```
