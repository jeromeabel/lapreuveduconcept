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

- **Hybrid mode** in Astro: Static & server rendering
  - Static is always the default. You opt individual routes into server rendering with export const prerender = false => hybrid when you add a server adapter (like netlify())

- During **pnpm build**, Astro splits the projects into two buckets using `prerender = false` or API route
   that exports GET/POST handlers:
    - **Static routes** → plain HTML files : We still need static data to serve all the content as fast as possible (Netlify uses CDN for static files)
    - **Server routes** → code that must run on each request = Server rendering: We need dynamic data for votes (server routes) -> Server adapter. Netlify runs your server routes as serverless functions behind the scenes.
    - Build flow: code (pages/api/vote.ts) → build (Astro identifies it as server-rendered) → Packages it as a Netlify Function (@astrojs/netlify adapter) → deploy (Netlify hosts the functionn check `.netlify/functions/` in the dist folder)

- **Serverless** functions for server routes: 
  - "serverless" in the sense that you don't manage a server. But there is a real server somewhere
  - Netlify spins up a container, runs your function file, and shuts it down.
  - The api/vote.ts becomes a small JavaScript file sitting on Netlify's infrastructure

- **Server**: costs when idle 24/7; always on, waiting for requests; a Node.js process running; you handle scaling
- **Serverless**: no request, no cost; Spins up per request, then stops; just your function, Netlify scales automatically (Each request gets its own container. So 100 simultaneous requests = 100 parallel executions. Nobody waits in line.). Trade-off: cold starts.
- **Cold Start**: a cold start is the delay when Netlify spins up a new container for the first request after the function has been idle. Subsequent requests reuse the warm container.

- **Why API routes are .ts files?**
  - A .astro file is for rendering HTML — it produces a page with a template, styles, layout, etc.                      
  - A .ts file in src/pages/api/ is a pure function — it receives a Request, runs logic, and returns a Response (typically JSON). No HTML, no component, no layout.
  - Astro uses file-based routing. The path src/pages/api/vote.ts maps directly to the URL /api/vote —  Any file under src/pages/ becomes a route.
  - The api/ folder is just a convention for organization.
  - the file exports named functions like GET or POST instead of an Astro template. They return Response objects instead of HTML. Astro sees that and treats it as an API endpoint.

- The **request/response cycle**
  1. The browser sends an HTTP request to your server (e.g. POST /api/vote)
  2. Netlify sees this route is server-rendered → runs your function
  3. Your function executes code (query DB, insert row, etc.)
  4. It returns an HTTP response (JSON data + status code)
  5. The browser receives the response and updates the UI

- **GET vs POST**: 
  - GET never changes data, POST can.
  - Browsers and caches assume GET requests are safe to repeat or cache. A POST is never cached.
  - POST = triggers a side effect (something changes on the server).
  - POST covers both "like" and "unlike" in one endpoint. no need update, delete


### Step 5 — Cookies & identity

- **Why cookies?**
  - Cookies are small key-value strings that the browser stores and automatically (no JS code) sends with every HTTP request to the same domain. (Header)
  - Server can read them
  - Cookie persists (if not expired) with the same browser, same device, next week
  - Trade-offs: they are not a stable identity. They are a best-effort, anonymous, per-browser identifier.
    - Differents browsers, devices, incognito, clearing browser data will clear the cookie
    - This is a comic blog vote counter. It's not an election or a financial transaction. The goal is roughly: "don't let someone spam-click and inflate counts."
- **How to make Cookies secure?**
  - The server sends a Set-Cookie header to create one. Cookies can be configured with several attributes.
  - `HttpOnly`: JS can't read it → XSS protection. Imagine an attacker injects a `<script>` tag into your page (via a comment field, a compromised dependency, etc.) — this is called XSS (Cross-Site Scripting), it cannot steal the cookie value, even if it runs on your page.
  steal the cookie value, even if it runs on your page.
  - `SameSite=lax`: Blocks cross-site POST → CSRF protection. Imagine a malicious site evil.com that contains a hidden form that auto-submits to leconceptdelapreuve.fr/api/vote. Without protection, your browser would send your cookie — and the server would think you made the request. This attack is called CSRF (Cross-Site Request Forgery).
  - `Secure`: HTTPS only → network protection
  - `Max-Age`: Expiry in seconds
- **Path** attribute
  - `Path=/`: Sent on all requests to the domain. Best fit that follow the real user navigation: home page, comics pages.
  - `Path=/api` would only send the cookie on `/api/*` routes — the server might not see the cookie on page requests, leading to inconsistent identity or duplicate cookies being created.

### Step 6 — GET endpoint

- What the server should do when it receives `GET /api/vote?comic=001,002`? :
1. Parse ?comic= → ["001", "002"]          ← URL / request parsing
2. Read cookie → get or create visitorId   ← identity
3. For each comicId: COUNT votes in DB     ← database query
4. For each comicId: check if visitorId voted ← database query
5. Build & return JSON map                 ← response
- **Drizzle & SQL**
  - Drizzle: `db.select({ value: count() }).from(Vote).where(eq(Vote.comicId, '001'))`
  - SQL: `SELECT COUNT(*) AS value FROM Vote WHERE comicId = '001'`
- `Response.json()` is a static method added in modern runtimes (Node 18+, Deno, browsers). It's shorthand for `new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })`. Astro's server runtime supports it natively.
- The `application/` prefix is the MIME type family — it tells the browser "this is structured data for an application to parse", not text to display. The browser (or fetch()) uses this header to know it should parse the body as JSON rather than treating it as plain text or HTML.

**From implementation**:
- In serverless, each DB round-trip has latency cost (cold container + network). 20 queries vs 2 queries matters more than row count at blog scale. Let the DB aggregate — that's what it's optimised for.
- **Option A — fetch all rows, aggregate in JS (1 query)**
```js
const allVotes = await db.select().from(Vote).where(inArray(Vote.comicId, comicIds));
// filter + count in JS
// 1 round-trip, but fetches every row — SQL does no aggregation
```

- **Option B — 2 queries with inArray + groupBy (always 2 queries)**
```js
// Get queries in parallel
const [comicsCounts, userVotes] = await Promise.all([
  
  // Query 1: counts per comic (SQL does the aggregation)
  db.select({ comicId: Vote.comicId, value: count() })
    .from(Vote)
    .where(inArray(Vote.comicId, comicIds))
    .groupBy(Vote.comicId),

  // Query 2: which comics did this visitor vote for?
  db.select({ comicId: Vote.comicId })
    .from(Vote)
    .where(and(
      inArray(Vote.comicId, comicIds),
      eq(Vote.visitorId, visitorId)
    )),
]);

/*
- Always 2 round-trips regardless of comic count
- SQL handles counting (efficient even with thousands of rows)
- JS only assembles the result map
*/
```

**How to test the endpoint**

```ts
export default async function seed() {
  await db.insert(Vote).values([
    { comicId: '001', visitorId: 'visitor-aaa' },
    { comicId: '001', visitorId: 'visitor-bbb' },
    { comicId: '002', visitorId: 'visitor-aaa' },
  ]);
}
```

Step 3 — Test with curl (or just paste the URL in your browser):
- Single comic: `curl "http://localhost:4321/api/vote?comic=001"`
- Multiple comics: `curl "http://localhost:4321/api/vote?comic=001,002"`
- Missing param — should return 400 `curl "http://localhost:4321/api/vote" `

Expected response for ?comic=001,002:
```json
{
  "result": [
    { "comicId": "001", "votes": 2, "userVoted": false },
    { "comicId": "002", "votes": 1, "userVoted": false }
  ]
}
```

userVoted will be false until you have an actual cookie. After testing, check your browser's DevTools → Application → Cookies — you should see the
visitorId cookie appear on the first request.


### Step 7 — POST endpoint
**Why POST (not GET or DELETE)?***
- POST signals "side effects" — not semantically "create only"
- Browser/cache/CDN never cache or auto-replay POST requests
- A single POST toggle endpoint is pragmatic: one URL, one handler, simpler client code
- Pure REST would split into POST (like) + DELETE (unlike) — more semantic but more surface area

**The toggle pattern**:
1. Get visitorId from cookie (or create one)
2. Query DB: does a vote exist for (comicId, visitorId)?
3. If yes → DELETE that row (unlike)
4. If no → INSERT a new row (like)
5. Query the new total COUNT
6. Return { comicId, count, voted } for the frontend to update

**Race condition & idempotency**:
- Frontend: debounce + disable button while request is pending
- Serverless: no shared memory → no mutex possible across instances
- Database: unique index on (comicId, visitorId) is the last line of defense — a duplicate INSERT throws a constraint error, which we catch
- Defense in depth: each layer covers a different failure mode

**Error handling decisions**:
- `request.json()` can throw on malformed body → wrap in try/catch → return 400
- Missing/invalid comicId → return 400 with an error message (Client sent bad data): don't retry, the request is wrong
- DB error → return 500 (Infrastructure failed): maybe retry later
- Success → 200 with the updated state

**Drizzle's .get() vs array return**
- `db.select()` returns an array, but adding `.limit(1).get()` returns a single object `({ count: 5 })` or `undefined`.

**How to test the endpoint**

Start the dev server (`pnpm dev`) and run these curl commands:

```bash
# Like comic 001 → should return { voted: true, count: 1 }
curl -X POST http://localhost:4321/api/vote \
  -H "Content-Type: application/json" \
  -d '{"comicId": "001"}' \
  -c cookies.txt -b cookies.txt

# Run again → toggles off { voted: false, count: 0 }
curl -X POST http://localhost:4321/api/vote \
  -H "Content-Type: application/json" \
  -d '{"comicId": "001"}' \
  -c cookies.txt -b cookies.txt
```

> `-c cookies.txt` saves the `visitorId` cookie, `-b cookies.txt` sends it on the next request.
> Without these flags, each curl call is a new visitor — the toggle won't work.

Test error cases:

```bash
# Missing comicId → 400
curl -X POST http://localhost:4321/api/vote \
  -H "Content-Type: application/json" \
  -d '{}'

# Malformed JSON → 400
curl -X POST http://localhost:4321/api/vote \
  -H "Content-Type: application/json" \
  -d 'not-json'
```

---

← Previous: [GUIDE-1-database.md](GUIDE-1-database.md) · Next → [GUIDE-3-client.md](GUIDE-3-client.md)
