# 005 — Vote Feature

> Status: **draft**

## Overview

Add a **like / heart** button to each comic, displayed in the `MetaBar` component. Visitors can toggle a like on any comic and see the total count. The page shell remains **static** (prerendered); a small **client-side island** fetches live counts from an API route and handles vote toggling.

## Goals

- Let visitors express appreciation for a comic with a single click
- Display the total like count publicly (e.g. `♥ 42`)
- Preserve the static-first architecture — no SSR pages, only SSR API endpoints
- Identify returning visitors via a cookie-based visitor ID (no auth)
- One like per visitor per comic (toggle on/off)

## Architecture

### Hybrid pattern: static shell + dynamic island

Follows the same approach as the [Fan Pickems article](https://lautarolobo.xyz/blog/fan-pickems) and Astro's Islands concept.

```
┌────────────────────────────────────┐
│  Static HTML (prerendered at build)│
│                                    │
│  ┌──────────────────────────────┐  │
│  │  MetaBar (static parts)      │  │
│  │  date · share · [VoteIsland] │  │
│  │                 ▲ hydrated   │  │
│  └──────────────────────────────┘  │
│                                    │
└────────────────────────────────────┘
          │  fetch              ▲ JSON
          ▼                    │
  ┌──────────────────────────────┐
  │  POST/GET /api/vote          │
  │  (SSR endpoint, prerender=   │
  │   false)                     │
  │  reads/writes Astro DB       │
  └──────────────────────────────┘
          │
          ▼
  ┌──────────────────────────────┐
  │  Turso (libSQL) — remote DB  │
  │  tables: Vote                │
  └──────────────────────────────┘
```

**Why this pattern?**

| Concern | Decision |
|---------|----------|
| Page speed | Static HTML — no server round-trip for the shell |
| Fresh counts | Client-side `fetch` on mount retrieves live count from API |
| Cost | Turso free tier (9 GB storage, 500 M rows read/month) is more than enough |
| Simplicity | Astro DB + Drizzle ORM is first-party, zero extra config |

### Data flow

1. **Page load** — static HTML renders the `MetaBar` with a placeholder vote button (count = `—`)
2. **Island hydrates** — a `<script>` fires a `GET /api/vote?comic=001` request
3. **API returns** `{ count: 42, voted: true }` — island updates the button
4. **User clicks** — `POST /api/vote` body `{ comic: "001" }` toggles the vote
5. **Optimistic UI** — count updates instantly; rolls back on error

## Database

### Astro DB + Turso

Use `@astrojs/db` with a **remote Turso** database in production.

- Local dev: built-in `.astro/content.db` (SQLite file, auto-created)
- Production: Turso libSQL (env vars `ASTRO_DB_REMOTE_URL`, `ASTRO_DB_APP_TOKEN`)
- Build command becomes `astro build --remote`

### Schema

```
db/config.ts
```

```ts
import { defineDb, defineTable, column } from 'astro:db';

const Vote = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    comicId: column.text(),       // e.g. "001"
    visitorId: column.text(),     // UUID from cookie
    createdAt: column.date({ default: new Date() }),
  },
  indexes: [
    { on: ['comicId', 'visitorId'], unique: true }, // one vote per visitor per comic
  ],
});

export default defineDb({ tables: { Vote } });
```

> **Note on `indexes`:** Astro DB supports `indexes` via the `defineTable` config. The unique composite index enforces the one-vote-per-visitor-per-comic rule at the DB level.

### Seed (dev only)

```
db/seed.ts
```

```ts
import { db, Vote } from 'astro:db';

export default async function () {
  await db.insert(Vote).values([
    { id: 1, comicId: '001', visitorId: 'dev-visitor-1', createdAt: new Date() },
    { id: 2, comicId: '001', visitorId: 'dev-visitor-2', createdAt: new Date() },
    { id: 3, comicId: '002', visitorId: 'dev-visitor-1', createdAt: new Date() },
  ]);
}
```

## Visitor Identification

### Cookie-based visitor ID

- On first visit, the API sets a `visitor_id` cookie containing a UUID (`crypto.randomUUID()`)
- `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=1y`, `Secure` (in prod)
- No personal data stored — purely anonymous
- Easy to bypass (clear cookies) — acceptable for a low-stakes like system

### Alternative considered

| Method | Pros | Cons |
|--------|------|------|
| IP hash | No cookie needed | Shared IPs, GDPR concerns |
| Auth (OAuth) | Reliable identity | Overkill for a comic site |
| localStorage | No server cookie | Not accessible from API |
| **Cookie UUID** ✓ | Simple, works server-side | Bypassable — acceptable |

## API Design

### `GET /api/vote`

Query params: `?comic=001` (or `?comic=001,002,003` for batch)

```ts
// src/pages/api/vote.ts
export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const visitorId = getOrCreateVisitorId(cookies);
  const url = new URL(request.url);
  const comicIds = url.searchParams.get('comic')?.split(',') ?? [];

  // Batch query: count per comic + whether this visitor voted
  const results = await Promise.all(
    comicIds.map(async (comicId) => {
      const [countResult] = await db
        .select({ value: count() })
        .from(Vote)
        .where(eq(Vote.comicId, comicId));

      const [voted] = await db
        .select()
        .from(Vote)
        .where(and(eq(Vote.comicId, comicId), eq(Vote.visitorId, visitorId)))
        .limit(1);

      return { comicId, count: countResult.value, voted: !!voted };
    })
  );

  return Response.json(results);
};
```

### `POST /api/vote`

Body: `{ "comic": "001" }`

```ts
export const POST: APIRoute = async ({ request, cookies }) => {
  const visitorId = getOrCreateVisitorId(cookies);
  const { comic: comicId } = await request.json();

  // Check existing vote
  const [existing] = await db
    .select()
    .from(Vote)
    .where(and(eq(Vote.comicId, comicId), eq(Vote.visitorId, visitorId)))
    .limit(1);

  if (existing) {
    // Unlike — remove vote
    await db.delete(Vote).where(eq(Vote.id, existing.id));
  } else {
    // Like — insert vote
    await db.insert(Vote).values({ comicId, visitorId });
  }

  // Return updated count
  const [countResult] = await db
    .select({ value: count() })
    .from(Vote)
    .where(eq(Vote.comicId, comicId));

  return Response.json({
    comicId,
    count: countResult.value,
    voted: !existing,
  });
};
```

### Helper: `getOrCreateVisitorId`

```ts
function getOrCreateVisitorId(cookies: AstroCookies): string {
  let id = cookies.get('visitor_id')?.value;
  if (!id) {
    id = crypto.randomUUID();
    cookies.set('visitor_id', id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }
  return id;
}
```

## Client-Side Island

### Approach: vanilla `<script>` (not a framework island)

Since the interaction is simple (fetch count, toggle on click), use a plain `<script>` tag that hydrates a `[data-vote]` element. No React/Preact/Svelte dependency needed — consistent with the rest of the project.

### MetaBar integration

Inside `MetaBar.astro`, add a vote button placeholder:

```astro
<!-- Vote button — hydrated client-side -->
<button
  data-vote={slug}
  class="vote-btn inline-flex items-center gap-1 p-2 text-zinc-600 hover:text-red-500 transition-colors"
  aria-label="J'aime"
  disabled
>
  <Icon name="carbon:favorite" class="size-4" aria-hidden="true" />
  <span data-vote-count>—</span>
</button>
```

### Client script

```ts
// src/scripts/vote.ts

async function initVote() {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-vote]');
  if (!buttons.length) return;

  // Batch fetch all comic IDs on the page
  const comicIds = [...buttons].map((btn) => btn.dataset.vote!);
  const unique = [...new Set(comicIds)];

  const res = await fetch(`/api/vote?comic=${unique.join(',')}`);
  const data: { comicId: string; count: number; voted: boolean }[] = await res.json();

  const map = Object.fromEntries(data.map((d) => [d.comicId, d]));

  for (const btn of buttons) {
    const id = btn.dataset.vote!;
    const info = map[id];
    if (!info) continue;

    const countEl = btn.querySelector('[data-vote-count]')!;
    countEl.textContent = String(info.count);
    btn.disabled = false;

    if (info.voted) {
      btn.classList.add('text-red-500');
      btn.setAttribute('aria-pressed', 'true');
    }

    btn.addEventListener('click', async () => {
      // Optimistic update
      const wasVoted = btn.getAttribute('aria-pressed') === 'true';
      const currentCount = parseInt(countEl.textContent || '0');
      const newCount = wasVoted ? currentCount - 1 : currentCount + 1;

      countEl.textContent = String(newCount);
      btn.classList.toggle('text-red-500');
      btn.setAttribute('aria-pressed', String(!wasVoted));

      try {
        const res = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comic: id }),
        });
        const result = await res.json();
        // Reconcile with server truth
        countEl.textContent = String(result.count);
        btn.setAttribute('aria-pressed', String(result.voted));
        btn.classList.toggle('text-red-500', result.voted);
      } catch {
        // Rollback on error
        countEl.textContent = String(currentCount);
        btn.classList.toggle('text-red-500', wasVoted);
        btn.setAttribute('aria-pressed', String(wasVoted));
      }
    });
  }
}

initVote();
```

Load in `MetaBar.astro` or `Layout.astro`:

```astro
<script src="@scripts/vote.ts"></script>
```

## UI / UX

### Visual states

| State | Icon | Color | Count |
|-------|------|-------|-------|
| Loading | `carbon:favorite` (outline) | `text-zinc-400` | `—` |
| Not voted | `carbon:favorite` (outline) | `text-zinc-600` | `12` |
| Voted | `carbon:favorite-filled` | `text-red-500` | `13` |
| Hover (not voted) | `carbon:favorite` (outline) | `text-red-500` | `12` |

### Position in MetaBar

```
┌──────────────────────────────────────────────────┐
│  15/02/2026  |  [Bluesky] [Copy]  |  ♥ 42        │
│              date    share actions    vote button  │
└──────────────────────────────────────────────────┘
```

The vote button sits at the **right end** of the MetaBar, after the share icons.

### Accessibility

- `aria-label="J'aime"` on the button
- `aria-pressed="true|false"` to convey toggle state
- `disabled` while loading — keyboard users can't interact with an uninitialized button
- Focus-visible ring via Tailwind defaults

## Rate Limiting / Abuse Prevention

For MVP, accept the low-stakes nature of a comic like counter:

- **DB-level uniqueness** — composite index prevents duplicate votes per visitor
- **Cookie-based** — clearing cookies = new identity (acceptable trade-off)
- **Netlify rate limiting** (optional, post-MVP) — limit POST requests to `/api/vote` per IP

If abuse becomes an issue later, consider:
- IP-based rate limiting at the edge (Netlify functions config)
- Adding an IP hash column for server-side dedup

## Implementation Steps

### Phase 1 — Database & API

1. `pnpm astro add db` — install `@astrojs/db`
2. Create `db/config.ts` with `Vote` table
3. Create `db/seed.ts` with dev data
4. Create `src/pages/api/vote.ts` with `GET` and `POST` handlers
5. Add `getOrCreateVisitorId` helper
6. Test locally with `pnpm dev` (uses local SQLite)

### Phase 2 — Client Island & UI

7. Add vote button markup to `MetaBar.astro`
8. Create `src/scripts/vote.ts` with fetch + toggle logic
9. Wire script import in layout or component
10. Style states (loading, voted, hover) with Tailwind

### Phase 3 — Production DB

11. Sign up for Turso, create database
12. Set `ASTRO_DB_REMOTE_URL` and `ASTRO_DB_APP_TOKEN` in Netlify env
13. Run `astro db push --remote` to create tables
14. Update build script to `astro build --remote`
15. Deploy and verify

### Phase 4 — Polish (post-MVP)

16. Heart animation on vote (CSS scale + color transition)
17. Error toast on vote failure
18. Optional: batch GET for the index page (single request for all comics)
19. Optional: Netlify edge rate limiting

## Acceptance Criteria

- [ ] Clicking the heart on any comic toggles a like
- [ ] Like count updates optimistically, reconciles with server
- [ ] Refreshing the page shows the persisted count + voted state
- [ ] One vote per visitor per comic (toggle off to unlike)
- [ ] Index page and detail page both show working vote buttons
- [ ] No SSR for pages — only `/api/vote` is server-rendered
- [ ] Works without JavaScript (button shows `—` as count, does not crash)

## References

- [Astro DB docs](https://docs.astro.build/en/guides/astro-db/)
- [Astro Islands](https://docs.astro.build/en/concepts/islands/)
- [Fan Pickems — Hybrid architecture example](https://lautarolobo.xyz/blog/fan-pickems)
- [Drizzle ORM API](https://orm.drizzle.team/)
- [Turso getting started](https://docs.turso.tech/cli/installation)
