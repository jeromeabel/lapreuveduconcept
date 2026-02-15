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
<!-- What did you learn? -->

### Step 9 — Optimistic UI
<!-- What did you learn? -->

### Step 10 — Production deploy
<!-- What did you learn? -->

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
