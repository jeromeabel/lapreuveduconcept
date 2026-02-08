# Le concept de la preuve

A minimal French comic blog

## Tech Stack

- **[Astro v5](https://astro.build/)** — hybrid rendering (static pages + server API)
- **[Astro DB](https://docs.astro.build/en/guides/astro-db/)** — libSQL/SQLite database for votes
- **[Tailwind CSS v4](https://tailwindcss.com/)** — via `@tailwindcss/vite` plugin
- **[Netlify](https://www.netlify.com/)** — deployment adapter with SSR support

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

Opens a local dev server at `http://localhost:4321`. The database is created and seeded automatically on first run.

### Build

```bash
pnpm build
```

The build script sets `ASTRO_DATABASE_FILE` automatically for local builds. For production with a remote database, use `astro build --remote` instead.

### Preview

```bash
pnpm preview
```

### Image Scripts

```bash
pnpm optimize-images <comicId>
pnpm generate-cover <comicId>
```

Use these scripts to prepare optimized panel assets and the cover image for a comic.

## Project Structure

```
├── db/
├── public/
├── src/
│   ├── components/
│   ├── content.config.ts      # Content collection schema
│   ├── data/
│   │   └── comics/            # Comic markdown files (frontmatter)
│   ├── layouts/
│   ├── pages/
│   │   ├── api/
│   │   ├── comics/
│   │   │   └── [slug].astro   # Comic detail page (prerendered)
│   │   └── index.astro        # Landing page (prerendered)
│   └── styles/
│       └── global.css         # Tailwind v4 + custom theme
├── astro.config.ts
└── tsconfig.json
```

## How It Works

### Comics

Comics are defined as markdown files in `src/data/comics/` with frontmatter (title, slug, panel images, speech bubble text). They are also seeded into the Astro DB `Comic` table for vote tracking.

### Voting System

- Cookie-based visitor identification — a random ID is set on first vote
- The visitor ID is SHA-256 hashed before storage in the database
- A unique index on `[comicId, visitorHash]` enforces one vote per visitor per comic
- `GET /api/vote?comicId=X` returns the current count and whether the visitor has voted
- `POST /api/vote` with `{ comicId }` registers a new vote

### Rendering Strategy

- **Static pages** (default): landing page and comic detail pages are prerendered at build time
- **Server endpoint**: `/api/vote` runs on-demand via Netlify Functions

### Layout Tokens

Layout sizing values live in `src/utils/layoutTokens.ts` and are applied as CSS variables in the layout. These tokens drive:

- The container width and padding
- The comic grid gap and margin
- The responsive image `sizes` math and the static `widths` list

## Environment Variables

See `.env.example` for all available variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `ASTRO_DATABASE_FILE` | For local build | Path to local SQLite file (set in build script) |
| `ASTRO_DB_REMOTE_URL` | For production | Turso/libSQL connection string |
| `ASTRO_DB_APP_TOKEN` | For production | Database auth token |

## License

See [LICENSE](LICENSE) for details.
