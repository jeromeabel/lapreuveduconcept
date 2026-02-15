# 005 — Vote Feature: Guide Part 1 — Database

> **Mode: Teacher**
> You are a patient programming teacher. For each step below, **explain concepts first**, **ask the student questions** to check understanding, and **only write code once the student demonstrates they grasp the idea**. Never dump a full implementation — build it up piece by piece through dialogue.

## How to use this guide

1. Open this file alongside the [plan](plan.md)
2. Tell the LLM: *"I'm working through GUIDE-1-database.md step N"*
3. The LLM follows the teaching instructions for that step
4. After each step, update the **LESSONS** section at the bottom with what you learned
5. When done → continue with [GUIDE-2-api.md](GUIDE-2-api.md)

---

## Step 1 — What is a database, and why do we need one here?

### Context

The site currently has **no server-side state**. Comics are markdown files rendered at build time. Adding a vote counter requires **persisting data across visits and users**.

### Teaching instructions

- Explain the difference between **static files** (what the site has now) and **dynamic state** (what votes need)
- Ask: *"Where does the vote count live right now? Where should it live? Why can't we just put it in a JSON file?"*
- Introduce the concept of a **relational database** vs a **key-value store** — which one fits better for votes?
- Discuss **SQLite** as an embedded database — what makes it different from PostgreSQL or MySQL?
- Ask: *"If two visitors vote at the exact same millisecond, what could go wrong? How does a database handle that?"* (introduce transactions / atomicity)

### Key vocabulary

- **SQL**, **table**, **row**, **column**, **primary key**, **index**
- **ACID** (atomicity, consistency, isolation, durability)
- **Embedded database** vs **client-server database**

### Don't write code yet — just discuss.

---

## Step 2 — Astro DB: the integration layer

### Context

Astro provides `@astrojs/db`, a first-party integration that wraps **libSQL** (an open-source fork of SQLite). It generates TypeScript types from your schema definition.

### Teaching instructions

- Explain the relationship: **Astro DB** → uses **Drizzle ORM** → talks to **libSQL** → which is a fork of **SQLite**
- Ask: *"What is an ORM? Why would you use one instead of writing raw SQL?"*
- Show how Astro DB works in **two modes**:
  - **Local** (`pnpm dev`): creates `.astro/content.db`, a local SQLite file — ephemeral, seeded fresh each restart
  - **Remote** (`--remote` flag): connects to a hosted Turso database via HTTP
- Ask: *"Why two modes? What problems would you have if dev always hit the production database?"*
- Explain `db/config.ts` as a **schema definition** — it describes the *shape* of data, not the data itself
- Ask: *"What is the difference between a schema and data? Can you give an analogy?"*

### Exploration task

Run `pnpm astro add db` together. Look at what files it creates and what it adds to `astro.config.mjs`. Don't write the Vote table yet — just observe the scaffolding.

### Key vocabulary

- **ORM** (Object-Relational Mapping)
- **Schema**, **migration**, **seed data**
- **libSQL**, **Turso**
- **Drizzle ORM**

---

## Step 3 — Designing the Vote table

### Context

We need to store: *which visitor liked which comic*. From the [plan](plan.md), the table is called `Vote`.

### Teaching instructions

- Before showing the schema, ask: *"If you had to track votes on paper, what columns would your table have? Draw it."*
- Let the student propose columns — guide them toward: `id`, `comicId`, `visitorId`, `createdAt`
- Ask: *"Why do we need both comicId AND visitorId? What rule does the pair enforce?"*
- Introduce **composite unique index** — explain it's like saying: "this pair of values must never repeat"
- Ask: *"What happens if we INSERT a row that violates the unique index? What error do we expect?"*
- Discuss **column types** in Astro DB: `column.text()`, `column.number()`, `column.date()`, `column.boolean()`, `column.json()`
- Ask: *"Why is comicId a `text` and not a `number`? Look at how comics are identified in this project."* (answer: comic IDs are strings like `"001"`)

### Coding task

Now write `db/config.ts` together. The student should type it — the LLM corrects and explains each line.

### Key vocabulary

- **Composite index**, **unique constraint**
- **Primary key** vs **natural key**
- **Column types**: text, number, date

---

## LESSONS

> Update this section after each step. Write in your own words what you learned.
> The LLM should not write these — only the student.

### Step 1 — Databases
- We need a place to store those entries that persists across visits and is shared between all users.
- The concurrent problem of single file (race condition):  This is the core reason databases exist beyond simple files. Databases provide atomicity — the guarantee that an operation like "read then increment" happens as one indivisible step, even with concurrent access. This is part of what's called ACID properties (Atomicity, Consistency, Isolation, Durability).
- We need just one table (Relational Database, not Key-Value): Vote. Each row says "this visitor liked this comic." The comic ID and visitor ID are just text columns in that row. User and Comic entities already lives elsewhere (content collection in Astro, cookies)
- Advantages of embedded database like SQLite: 
  - one file (Binary format managed by an engine). "Single file" describes where the data lives, not how it's accessed. SQLite the engine sits between your code and the file, enforcing all the safety guarantees. You never open the .db file directly — you always go through SQLite.
  - no server -> Turso will make it available in the cloud
  - local during development
  - Trade-off: no multiple servers simultaneously

### Step 2 — Astro DB
- Astro provides a first-party integration called @astrojs/db
- The flow: Astro Db > Drizzle ORM > libSQL (open source fork of SQLite) > SQLite file .db
- Advantages of ORM
  - one language
  - Type safety with TypeScript: autocomplete and compile-time errors                                       
  - SQL injection protection                                                
  - Migrations: when you change the schema, the ORM helps evolve the database
  - Refactoring is safer — rename a column and the compiler catches every usage
  - Everything stays synchronized in the codebase.
- Drizzle:
  - Schema: TypeScript (vs Prisma own language)
  - Stays close to SQL syntax (vs Prisma: Custom query API)
  - Lightweight, thin wrapper (vs Prisma, heavier with its own engine)
- Astro DB has two modes:
  - Local (pnpm dev): creates a .astro/content.db file — a fresh SQLite database, re-seeded on each restart (= sandbox)
  - Remote (--remote flag): connects to a hosted Turso database via HTTP
- Schema & Data:
  - Schema: shape of data (columns definitions: types/constraints) : header of a spreadsheet
  - Data: Rows of the spreadsheet
- db/configs.ts: Schema definition — empty tables: {} for now
- db/seed.ts: Seed file — runs on each pnpm dev to populate the local database with test data


### Step 3 — Table design

```ts
const Vote = defineTable({
  columns: {
    id: column.number({ primaryKey: true }), // auto-incremented, auto filled 
    comicId: column.text(), // "004" convention from the filename - existing collection, not the user
    visitorId: column.text(),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [{ on: ['comicId', 'visitorId'], unique: true }], // UNIQUE constraint 1 vote per user for one comic = "unique index" -> it will throw an Error
})
```
- Validation - Each layer validates what it knows best: 
  - Databases enforce relational integrity (uniqueness, foreign keys). 
  - Application code enforces business rules (does this comic exist? is this visitor allowed to vote?).
- Index is both a performance tool and a data integrity tool
  - a data structure the database builds alongside your table to make lookups fast. Without an index, finding all votes for comic "003" means scanning every single row. With an index on comicId, the database can jump directly to the right rows.
  - Our index does double duty:
    - on: ['comicId', 'visitorId'] — speeds up queries that filter by this pair
    - unique: true — also enforces the constraint that the pair can't repeat

---

Next → [GUIDE-2-api.md](GUIDE-2-api.md)
