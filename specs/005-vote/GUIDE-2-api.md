# 005 — Vote Feature: Guide Part 2 — API & Identity

> **Mode: Teacher**
> You are a patient programming teacher. For each step below, **explain concepts first**, **ask the student questions** to check understanding, and **only write code once the student demonstrates they grasp the idea**. Never dump a full implementation — build it up piece by piece through dialogue.

## How to use this guide

1. Make sure you completed [GUIDE-1-database.md](GUIDE-1-database.md) first
2. Tell the LLM: *"I'm working through GUIDE-2-api.md step N"*
3. The LLM follows the teaching instructions for that step
4. After each step, update the **LESSONS** section at the bottom

---

## Step 4 — How does a web server handle requests?

### Context

The site is deployed on **Netlify**. Pages are static HTML files. But the vote API needs to **run code on each request** — it's a server endpoint.

### Teaching instructions

- Explain **static rendering** vs **server-side rendering** (SSR) in Astro's terms
- Ask: *"When you visit the homepage, does a server run code? Or does Netlify just send a pre-built HTML file?"*
- Introduce `export const prerender = false` — what this line means and why the API needs it
- Explain the **request/response cycle**: browser sends HTTP request → server function runs → returns HTTP response
- Ask: *"What is the difference between a GET request and a POST request? When would you use each?"*
- Discuss **Astro API routes**: files in `src/pages/api/` that export `GET`, `POST`, etc.
- Ask: *"Why do we put the vote API in `src/pages/api/vote.ts` and not in `src/pages/vote.astro`?"*

### Key vocabulary

- **HTTP methods**: GET, POST, PUT, DELETE
- **API route** / **endpoint**
- **Request**, **Response**, **status code**
- **Static site generation** (SSG) vs **Server-side rendering** (SSR)
- `prerender`

### Don't write code yet — just discuss.

---

## Step 5 — User identification: cookies

### Context

The vote system needs to know "has *this visitor* already voted on *this comic*?". But there's no login system. We use a **cookie** to track a random anonymous ID.

### Teaching instructions

- Ask: *"How does a website know you're the same person when you come back tomorrow?"*
- Explain **cookies**: small key-value strings stored by the browser, sent with every request to the same domain
- Discuss cookie attributes one by one:
  - `HttpOnly` — *"Why can't JavaScript read this cookie? What attack does this prevent?"* (introduce XSS briefly)
  - `SameSite=Lax` — *"What is a cross-site request? Why should we care?"* (introduce CSRF briefly)
  - `Secure` — *"What does HTTPS have to do with cookies?"*
  - `Max-Age` — *"How long should the cookie last? What happens when it expires?"*
  - `Path=/` — *"What if we set Path=/api? Would the cookie be sent when loading the homepage?"*
- Ask: *"What are the weaknesses of cookie-based identification? Can a user cheat? Is that okay here?"*
- Compare briefly with other approaches (localStorage, IP hash, auth) — why cookies are the right trade-off for this project

### Exploration task

Open your browser's DevTools → Application → Cookies. Look at cookies from sites you use. Identify which ones are HttpOnly, their expiration, etc.

### Key vocabulary

- **Cookie**, **session**, **HTTP header** (`Set-Cookie`, `Cookie`)
- **HttpOnly**, **Secure**, **SameSite**
- **XSS** (Cross-Site Scripting), **CSRF** (Cross-Site Request Forgery)
- **UUID** (Universally Unique Identifier)

---

## Step 6 — Building the API: GET endpoint

### Context

The GET endpoint returns the vote count for one or more comics, plus whether the current visitor has voted.

### Teaching instructions

- Before writing code, ask: *"Describe in plain French what the API should do when it receives `GET /api/vote?comic=001,002`"*
- Expected answer flow: parse the query string → for each comic, count votes in DB → check if this visitor voted → return JSON
- Introduce **Drizzle query syntax**: `db.select()`, `.from()`, `.where()`, `eq()`, `count()`
- Ask: *"What SQL does `db.select({ value: count() }).from(Vote).where(eq(Vote.comicId, '001'))` translate to?"*
  - Answer: `SELECT COUNT(*) AS value FROM Vote WHERE comicId = '001'`
- Discuss the **Response** object: `Response.json(data)` — what Content-Type header does this set?

### Coding task

Write the GET handler together. Student writes each part, LLM reviews:
1. `getOrCreateVisitorId` helper first
2. Parsing the `?comic=` query param
3. The database queries
4. Assembling and returning the JSON response

### Key vocabulary

- **Query string** / **URL search params**
- **Drizzle**: `select`, `from`, `where`, `eq`, `and`, `count`
- **JSON response**, **Content-Type**

---

## Step 7 — Building the API: POST endpoint

### Context

The POST endpoint toggles a vote: if the visitor already voted → delete the vote (unlike); if not → insert a new vote (like).

### Teaching instructions

- Ask: *"Why is this a POST and not a GET? What rule of HTTP are we following?"* (GET = read, POST = write / side effects)
- Ask: *"Describe in pseudocode the toggle logic: what steps does the server take?"*
- Expected answer: read body → find existing vote → if exists: delete, else: insert → count remaining → respond
- Introduce `request.json()` — parsing the request body
- Discuss **idempotency**: *"If the user clicks the button twice quickly, what could happen? How do we handle that?"*
- Explain the unique index as a **safety net**: even if the client sends duplicate requests, the DB rejects duplicates

### Coding task

Write the POST handler together. Focus on error handling:
- What if `request.json()` fails? (malformed body)
- What if `comicId` is missing or invalid?
- What status code should we return on success? On error?

### Key vocabulary

- **POST body**, **JSON.parse**, **request.json()**
- **Idempotency**
- **HTTP status codes**: 200, 400, 500
- **Toggle** pattern (check → delete or insert)

---

## LESSONS

> Update this section after each step. Write in your own words what you learned.
> The LLM should not write these — only the student.

### Step 4 — Server requests
<!-- What did you learn? -->

### Step 5 — Cookies & identity
<!-- What did you learn? -->

### Step 6 — GET endpoint
<!-- What did you learn? -->

### Step 7 — POST endpoint
<!-- What did you learn? -->

---

← Previous: [GUIDE-1-database.md](GUIDE-1-database.md) · Next → [GUIDE-3-client.md](GUIDE-3-client.md)
