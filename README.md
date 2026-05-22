# Le concept de la preuve

A minimal French comic blog

## Tech Stack

- **[Astro v5](https://astro.build/)** — static site (fully prerendered)
- **[Tailwind CSS v4](https://tailwindcss.com/)** — via `@tailwindcss/vite` plugin
- **[Netlify](https://www.netlify.com/)** — static hosting and CDN
- **PHP + MySQL** — vote API on OVH shared hosting (`api.jeromeabel.net`)

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/)

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Opens a local dev server at `http://localhost:4321`. Vote requests hit the staging endpoint (`vote-staging.php`) which writes to a separate `votes_staging` table.

### Build

```bash
pnpm build
```

### Preview

```bash
pnpm preview
```

### Image Scripts

```bash
pnpm optimize <comicId>
pnpm cover <comicId>
```

Use these scripts to prepare optimized panel assets and the cover image for a comic.

## Project Structure

```
├── public/
├── src/
│   ├── components/
│   ├── content.config.ts      # Content collection schema
│   ├── data/
│   │   └── comics/            # Comic markdown files (frontmatter)
│   ├── layouts/
│   ├── pages/
│   │   ├── comics/
│   │   │   └── [slug].astro   # Comic detail page (prerendered)
│   │   └── index.astro        # Landing page (prerendered)
│   ├── styles/
│   │   └── global.css         # Tailwind v4 + custom theme
│   └── utils/
│       └── voteConfig.ts      # Vote API URL by environment
├── astro.config.ts
└── tsconfig.json
```

## How It Works

### Comics

Comics are defined as markdown files in `src/data/comics/` with frontmatter (title, slug, panel images, speech bubble text).

### Voting System

Votes are handled by a PHP file on OVH shared hosting — no serverless, no cold starts:

```
leconceptdelapreuve.jeromeabel.net (Netlify CDN — static)
  └─ fetch() → api.jeromeabel.net/vote.php (OVH PHP + MySQL)
```

- Cookie-based visitor identification (`httpOnly`, `SameSite=None`, `domain=.jeromeabel.net`)
- `GET /vote.php?comicIds[]=X&comicIds[]=Y` — returns counts + voted state for multiple comics
- `POST /vote.php` with `{ comicId }` — toggles vote (insert or delete)
- Composite unique index on `(comic_id, visitor_id)` enforces one vote per visitor per comic
- `pnpm dev` hits `vote-staging.php` → `votes_staging` table (isolated from production)

### Rendering Strategy

Fully static — all pages are prerendered at build time. No Netlify Functions or SSR.

### Layout Tokens

Layout sizing values live in `src/utils/layoutTokens.ts` and are applied as CSS variables in the layout. These tokens drive:

- The container width and padding
- The comic grid gap and margin
- The responsive image `sizes` math and the static `widths` list

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PUBLIC_VOTE_API_URL` | Override the vote API URL (defaults to staging in dev, production in build) |

## License

See [LICENSE](LICENSE) for details.
