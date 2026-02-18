# 005 — Vote Feature: Guide Part 3 — Client & Deploy

> **Mode: Teacher**
> You are a patient programming teacher. For each step below, **explain concepts first**, **ask the student questions** to check understanding, and **only write code once the student demonstrates they grasp the idea**. Never dump a full implementation — build it up piece by piece through dialogue.

## How to use this guide

1. Make sure you completed [GUIDE-2-api.md](GUIDE-2-api.md) first
2. Tell the LLM: *"I'm working through GUIDE-3-client.md step N"*
3. The LLM follows the teaching instructions for that step
4. After each step, update the **LESSONS** section at the bottom

---

## Step 8 — The client-side island: fetching and rendering

### Context

The page is static HTML. A `<script>` runs in the browser to fetch live vote data and make the button interactive.

### Teaching instructions

- Ask: *"What is the Fetch API? How does `fetch('/api/vote?comic=001')` work?"*
- Explain the **lifecycle**: HTML loads → script runs → fetch fires → response arrives → DOM updates
- Ask: *"Why does the button start as `disabled` with count '—'? What would happen if we didn't disable it?"*
- Introduce **DOM manipulation**: `querySelector`, `textContent`, `classList`, `setAttribute`
- Ask: *"What is the difference between `classList.add('text-red-500')` and `classList.toggle('text-red-500')`?"*
- Discuss `data-*` attributes as a bridge between server-rendered HTML and client JavaScript

### Coding task

Write the `initVote()` function step by step:
1. First: just the fetch + console.log the response
2. Then: update the count text
3. Then: enable the button and set voted state
4. Save click handler for next step

### Key vocabulary

- **Fetch API**, **Promise**, **async/await**
- **DOM** (Document Object Model)
- **`data-*` attributes** (dataset)
- **Progressive enhancement**

---

## Step 9 — Optimistic UI and error handling

### Context

When the user clicks the heart, we update the UI **immediately** before the server responds. If the server fails, we **roll back**.

### Teaching instructions

- Ask: *"Why not wait for the server to respond before updating the button? What would the user experience be like?"*
- Introduce **optimistic UI**: assume success, fix on failure
- Draw the timeline:
  ```
  Click → UI updates instantly → POST fires → Server responds
                                              ↳ success: reconcile count
                                              ↳ failure: rollback to previous state
  ```
- Ask: *"What values do we need to save before updating, so we can rollback?"* (previous count, previous voted state)
- Discuss **try/catch** around `fetch` — what kinds of errors can happen? (network failure, 500 response, timeout)
- Ask: *"Should we also handle non-200 responses inside the try block? `fetch` doesn't throw on 404 or 500."*

### Coding task

Add the click handler with:
1. Save current state
2. Optimistic update
3. POST request
4. Reconcile or rollback

### Key vocabulary

- **Optimistic UI** vs **pessimistic UI**
- **Rollback**
- **try/catch/finally**
- **Network error** vs **HTTP error**

---

## Step 10 — Production: Turso and deployment

### Context

In dev, the database is a local SQLite file. In production, we need a hosted database that persists across deployments.

### Teaching instructions

- Explain **Turso**: a managed libSQL platform. Free tier is generous for small projects.
- Walk through the setup:
  1. Install Turso CLI
  2. `turso db create leconceptdelapreuve`
  3. Get the URL and token
  4. Set environment variables on Netlify
  5. `astro db push --remote`
- Ask: *"What does `astro db push --remote` do? Why is it needed?"* (pushes the schema — creates/updates tables on the remote DB)
- Ask: *"Why do we store the DB token in environment variables instead of in the code?"* (introduce **secrets management**)
- Discuss the `--remote` flag on the build command and what happens without it
- Ask: *"If we change the schema later (add a column), what do we need to do?"* (push again, handle migrations)

### Hands-on task

Set up Turso together. The student runs each CLI command and the LLM explains what happened.

### Key vocabulary

- **Environment variables**, **secrets**
- **Schema push** / **migration**
- **CLI** (Command-Line Interface)
- **Managed database** vs **self-hosted**

---

## LESSONS

> Update this section after each step. Write in your own words what you learned.
> The LLM should not write these — only the student.

### Step 8 — Client-side fetch
- Two-step response (headers → `.json()`)
- `fetch` is asynchronous. It doesn't block the page. The browser fires the HTTP request in the background and returns a Promise immediately. 
- `response.json()` is also a Promise — it streams and parses the body separately from receiving the headers.

```ts
// The response comes in two steps:
const response = await fetch('/api/vote?comic=001'); // Promise → Response object
const data = await response.json();                  // Promise → parsed JS object
```

- **Progressive enhancement** / honest loading state:
  - The page works (it renders) before the JS runs, and the button becomes interactive once it's safe to use.
  - Disabled: The button starts disabled because we don't have the real data yet. 
  - The count shows — instead of 0 because 0 would be a lie 

- `data-comic-id="001"` attribute.
  - `<button data-comic-id="001">♥ <span>—</span></button>`
  - With `data-*` attributes, the data lives with the element. Each button carries its own context
  - `dataset.comicId` is how JS reads `data-comic-id` — the browser automatically converts kebab-case to camelCase.

```js
document.querySelectorAll('button[data-comic-id]').forEach(button => {
  const comicId = button.dataset.comicId; // "001", "002", etc.
  // Each button brings its own data
});
```

  - `classList.toggle` & `classList.add`
    - After GET — setting initial state
    - After POST — reconciling server response

```js
const newVoted = !voted; // you know this from your variable
button.classList.toggle('voted', newVoted); // second argument = force true/false
```

### Step 9 — Optimistic UI

**Network error vs HTTP error**
- A **network error** means no response arrived: browser offline, DNS failure,
  server unreachable, CORS rejected. `fetch` *throws* in these cases → `catch` runs.
- An **HTTP error** (404, 500…) means the server *did* respond, just with a bad
  status. `fetch` does **not** throw — it returns a `Response` with `ok === false`.
  If you don't check it, the error is silently swallowed.
- `fetchJson` in `vote.ts` bridges the gap: it reads `!response.ok` and throws
  manually, so both failure kinds land in the same `catch` block.

```ts
if (!response.ok) {
  const errData = await response.json().catch(() => ({})); 
  throw new Error(errData.error ?? `HTTP ${response.status}`); // .json errors will be catched or fallback with HTTP status
} 
```

**Optimistic UI**
- On click: save `prev`, compute `optimistic`, call `updateButtonUI` immediately.
  The user sees feedback before the POST leaves the browser → good UX.
- Trade-off: the UI can briefly show a state that the server later rejects.
  That's acceptable here because votes are low-stakes and rollback is instant.
- When the server responds, `updateButtonUI` is called again with the *real* count
  (reconciliation). The server is the source of truth; the optimistic guess might
  be wrong (e.g. race condition where two clients vote simultaneously).

**Rollback — the two saved values**
- `prev = state.get(comicId)` saves both `{ count, voted }` before the optimistic update. Count alone isn't enough: restoring only the number leaves the button color (text-green-500 = voted state) out of sync with reality.

**Pending**
- Guards against a click arriving while a POST is already in flight — most commonly a rapid double-click.
- Without it, the second click would save the already-optimistic state as `prev`, fire a second POST, and rollback would restore the wrong state on failure.
- `button.disabled` would also block double-clicks, but it requires re-enabling in both success and error paths. With the `Set`, `finally` is the single cleanup path and the button stays visually enabled throughout (no grey flicker).

```ts
if (pending.has(comicId)) return;   // second click while in-flight → ignored
pending.add(comicId);
// ... POST ...
finally { pending.delete(comicId); } // clears in all outcomes
```

**Debounce**?
- Debounce shines for inputs where you want to avoid firing on every keystroke — search fields, resize handlers, form validation. For a button action where you want the first click to feel immediate, pending is the right tool.
- You could technically combine both, but it would be over-engineering for a vote button: pending already covers the only real risk (concurrent requests), with zero UX cost.

**State in JS vs state in DOM**
- `span.textContent` is always a string → `parseInt()` required for math, and
  TypeScript can't help if it fails. The `Map<string, VoteState>` is typed.
- DOM is the *display* layer, not the *data* layer. Coupling logic to the rendered
  HTML means a markup change silently breaks your JS.
- The `Map` lives in the shared closure of `initVote`, accessible to both the GET
  hydration and `handleVote` POST handler. Rollback is just
  `state.set(comicId, prev)` — no DOM query needed to know the previous state.


### Step 10 — Production deploy

**Setup Turso** — install, login, create DB, get credentials, push schema:
```bash
curl -sSfL https://get.tur.so/install.sh | bash
source ~/.bashrc
turso auth login
turso db create leconceptdelapreuve
turso db show leconceptdelapreuve --url   # → ASTRO_DB_REMOTE_URL
turso db tokens create leconceptdelapreuve # → ASTRO_DB_APP_TOKEN
pnpm astro db push --remote
```

**What does `astro db push --remote` do?**
- `--remote` switches the target from your local SQLite file to the hosted Turso database.
- Pushes your `defineDb` table schemas to the remote database — creates or updates tables.
- Schema always before build: if you update a table locally, push first, then build. Reversed order = runtime crash.

**Why store the DB token in environment variables, not in code?**
- Tokens in source code end up in git history forever — even after deletion, old commits still contain them.
- `.env` is git-ignored: the token never gets committed.
- To rotate a compromised token: generate a new one and update the value in Netlify's UI — no git rewrite needed.
- Add both `ASTRO_DB_REMOTE_URL` and `ASTRO_DB_APP_TOKEN` in Netlify → Site configuration → Environment variables.

**What's the role of `netlify.toml`?**
- Moves deployment config into version control — visible in the repo, not hidden in Netlify's UI.
- Sets `astro build --remote` as the build command so the compiled server functions connect to Turso, not a missing local file.

---

**Common use cases**

Update a table (add a column, change a constraint):
```bash
# 1. Edit db/config.ts, then:
pnpm astro db push --remote   # update schema on Turso
pnpm build                    # netlify.toml handles --remote on deploy
```

Develop against the real remote data instead of an empty local DB:
```bash
pnpm astro dev --remote       # dev server talks to Turso directly
```

Copy remote data to local (seed local DB with real production data):
```bash
turso db shell leconceptdelapreuve ".dump" > dump.sql
sqlite3 .astro/content.db < dump.sql
```

In more complex projects, schema changes become proper **migrations** — versioned, reversible SQL. Astro DB keeps it simple, but the mental model is the same: schema changes always precede code that depends on them.

---

← Previous: [GUIDE-2-api.md](GUIDE-2-api.md)

## Quick reference (all steps)

| Step | Guide | Topic | Concepts |
|------|-------|-------|----------|
| 1 | [Part 1](GUIDE-1-database.md) | Why a database? | Static vs dynamic, SQL, ACID |
| 2 | [Part 1](GUIDE-1-database.md) | Astro DB | ORM, Drizzle, libSQL, local vs remote |
| 3 | [Part 1](GUIDE-1-database.md) | Table design | Schema, columns, composite index, unique constraint |
| 4 | [Part 2](GUIDE-2-api.md) | Server requests | HTTP methods, API routes, SSG vs SSR, prerender |
| 5 | [Part 2](GUIDE-2-api.md) | Cookies | HttpOnly, Secure, SameSite, XSS, CSRF, UUID |
| 6 | [Part 2](GUIDE-2-api.md) | GET endpoint | Query params, Drizzle queries, JSON response |
| 7 | [Part 2](GUIDE-2-api.md) | POST endpoint | Request body, toggle logic, idempotency, status codes |
| 8 | [Part 3](GUIDE-3-client.md) | Client island | Fetch API, DOM manipulation, data attributes |
| 9 | [Part 3](GUIDE-3-client.md) | Optimistic UI | Rollback, try/catch, network vs HTTP errors |
| 10 | [Part 3](GUIDE-3-client.md) | Production | Turso, env vars, schema push, secrets management |
