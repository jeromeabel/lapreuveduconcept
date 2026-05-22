# Le concept de la preuve

> `CLAUDE.md` is a symlink to this file — both Claude Code and VS Code AI read from `AGENTS.md`.

## Commands

```bash
pnpm dev       # Start dev server
pnpm build     # Production build
pnpm preview   # Preview production build
pnpm optimize <comicId>  # Generate optimized images for a comic
pnpm cover <comicId>   # Generate cover image for a comic
```

## Tech Stack

- **Astro v5** — static-first framework with hybrid rendering
- **Tailwind CSS v4** — via `@tailwindcss/vite` Vite plugin (NOT the old `@astrojs/tailwind` integration)
- **Netlify** (`@astrojs/netlify`) — deployment adapter with SSR support
- **pnpm** — package manager

## Key Architecture

- Hybrid rendering: static pages by default, `export const prerender = false` for server routes
- Config in `astro.config.mjs` — Netlify adapter + Tailwind via Vite plugin
- Styles in `src/styles/global.css`
- Add integrations with: `pnpm astro add <name>`

## Conventions

- Use `pnpm` (not npm or yarn)
- Prefer Astro integrations and Vite plugins over manual configuration
- Static rendering by default — only opt into SSR for dynamic endpoints
- Tailwind CSS v4 is a Vite plugin, NOT an Astro integration
- Layout sizing tokens live in `src/utils/layoutTokens.ts` and are applied as CSS variables in the layout

## Specs (`specs/`)

The `specs/` folder contains specifications, plans, and design documents that guide implementation.

- **Before implementing a feature**: read `specs/README.md` for an index of available specs, then read relevant spec files
- **When brainstorming or planning**: write output to `specs/<NNN>-<name>/plan.md` and update `specs/README.md`
- **When executing a plan**: treat the spec as the source of truth for requirements and acceptance criteria
- Each iteration gets its own folder: `specs/<NNN>-<name>/` containing `plan.md` and any related docs

## Voting System

Votes use a PHP + MySQL backend on OVH shared hosting — not Astro DB or Turso.

- API: `https://api.jeromeabel.net/vote.php` (prod) / `vote-staging.php` (dev/preview)
- URL selected in `src/utils/voteConfig.ts` via `PUBLIC_VOTE_API_URL` env var
- Dev hits staging table (`votes_staging`), production hits `votes`
- Cookie identity: `httpOnly`, `SameSite=None`, `domain=.jeromeabel.net`
- Site is fully static — no `prerender = false`, no Netlify Functions
