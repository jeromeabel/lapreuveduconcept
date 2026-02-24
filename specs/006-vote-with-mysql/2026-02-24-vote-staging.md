# Vote Staging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable the Astro dev server to hit a `votes-staging` MySQL table so local development doesn't pollute production vote data.

**Architecture:** A `vote-staging.php` wrapper sets `$TABLE` and `$ALLOWED_ORIGINS` variables, then requires `vote.php` which defaults to prod values. The Astro client switches URL based on `import.meta.env.DEV`.

**Tech Stack:** PHP 8.1 (OVH), Astro v5, TypeScript

**Design doc:** `specs/006-vote-with-mysql/staging-design.md`

---

## Task 1: Update `vote.php` — parameterize table name and CORS

**Files:**
- Modify: `vote.php` (lives on OVH, local copy for reference in `specs/006-vote-with-mysql/`)

The PHP file is deployed via FTP to OVH, not part of the Astro build. This task produces the updated file content to upload.

**Step 1: Create local `vote.php` with the two changes**

Create `api/vote.php` at the project root (for FTP deployment). Copy the current production `vote.php` from OVH, then apply these two changes:

1. After the CORS preflight block (after `OPTIONS` exit), add the table default:

```php
$TABLE = $TABLE ?? 'votes';
```

2. Replace the hardcoded CORS origin check:

```php
// OLD:
$allowed_origin = 'https://leconceptdelapreuve.jeromeabel.net';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin === $allowed_origin) {
    header("Access-Control-Allow-Origin: $allowed_origin");
    header('Access-Control-Allow-Credentials: true');
}
```

```php
// NEW:
$ALLOWED_ORIGINS = $ALLOWED_ORIGINS ?? ['https://leconceptdelapreuve.jeromeabel.net'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $ALLOWED_ORIGINS, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}
```

3. Replace every literal `'votes'` table reference in SQL with `$TABLE`. There are 4 occurrences:

```php
// In GET handler — count query:
"SELECT comic_id, COUNT(*) AS cnt FROM {$TABLE} WHERE comic_id IN ($placeholders) GROUP BY comic_id"

// In GET handler — voted query:
"SELECT comic_id FROM {$TABLE} WHERE comic_id IN ($placeholders) AND visitor_id = ?"

// In POST handler — check existing:
"SELECT id FROM {$TABLE} WHERE comic_id = ? AND visitor_id = ? LIMIT 1"

// In POST handler — delete:
"DELETE FROM {$TABLE} WHERE comic_id = ? AND visitor_id = ?"

// In POST handler — insert:
"INSERT INTO {$TABLE} (comic_id, visitor_id) VALUES (?, ?)"

// In POST handler — count:
"SELECT COUNT(*) FROM {$TABLE} WHERE comic_id = ?"
```

**Step 2: Commit**

```bash
git add api/vote.php
git commit -m "feat(api): parameterize table name and CORS origins in vote.php"
```

---

## Task 2: Create `vote-staging.php`

**Files:**
- Create: `api/vote-staging.php`

**Step 1: Create the wrapper file**

```php
<?php
$TABLE = 'votes-staging';
$ALLOWED_ORIGINS = [
    'https://leconceptdelapreuve.jeromeabel.net',
    'http://localhost:4321',
];
require __DIR__ . '/vote.php';
```

**Step 2: Commit**

```bash
git add api/vote-staging.php
git commit -m "feat(api): add vote-staging.php wrapper for dev environment"
```

---

## Task 3: Update `src/scripts/vote.ts` — env-based API URL

**Files:**
- Modify: `src/scripts/vote.ts:62` and `src/scripts/vote.ts:99`

**Step 1: Add the API_URL constant**

At the top of the file (after the type declarations, before `fetchJson`), add:

```ts
const API_URL = import.meta.env.DEV
  ? "https://api.jeromeabel.net/vote-staging.php"
  : "https://api.jeromeabel.net/vote.php";
```

**Step 2: Replace hardcoded URLs**

Line 62 — POST handler:
```ts
// OLD:
const result = await fetchJson<{ count: number; voted: boolean }>("https://api.jeromeabel.net/vote.php", {

// NEW:
const result = await fetchJson<{ count: number; voted: boolean }>(API_URL, {
```

Line 99 — GET fallback:
```ts
// OLD:
data = await fetchJson<PhpGetResponse>(`https://api.jeromeabel.net/vote.php?${params}`);

// NEW:
data = await fetchJson<PhpGetResponse>(`${API_URL}?${params}`);
```

**Step 3: Commit**

```bash
git add src/scripts/vote.ts
git commit -m "feat(vote): switch API URL based on dev/prod environment"
```

---

## Task 4: Update `src/layouts/Layout.astro` — early-fetch URL

**Files:**
- Modify: `src/layouts/Layout.astro:38-41`

The early-fetch inline script currently hardcodes the prod URL. Since the frontmatter runs server-side, `import.meta.env.DEV` is available there. Pass the correct URL via `define:vars`.

**Step 1: Add the API URL variable in the frontmatter section**

After `const layoutStyle = ...` (line 27), add:

```ts
const voteApiUrl = import.meta.env.DEV
  ? 'https://api.jeromeabel.net/vote-staging.php'
  : 'https://api.jeromeabel.net/vote.php';
```

**Step 2: Update the inline script to use it**

```astro
<!-- OLD: -->
{earlyVoteParam && (
  <script is:inline define:vars={{ earlyVoteParam }}>
    window.__votePromise = fetch('https://api.jeromeabel.net/vote.php?comics=' + earlyVoteParam, { credentials: 'include' });
  </script>
)}

<!-- NEW: -->
{earlyVoteParam && (
  <script is:inline define:vars={{ earlyVoteParam, voteApiUrl }}>
    window.__votePromise = fetch(voteApiUrl + '?comics=' + earlyVoteParam, { credentials: 'include' });
  </script>
)}
```

**Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat(layout): use env-based API URL for early vote fetch"
```

---

## Task 5: Verify locally

**Step 1: Run the dev server**

```bash
pnpm dev
```

**Step 2: Open browser DevTools → Network tab**

Navigate to a page with vote buttons. Verify:

- GET request goes to `https://api.jeromeabel.net/vote-staging.php?comics=...`
- Click a vote button → POST goes to `https://api.jeromeabel.net/vote-staging.php`
- Responses return 200 (not CORS errors)
- Vote counts reflect the staging table data (not prod data)

**Step 3: Verify prod build uses correct URL**

```bash
pnpm build
```

Search the build output for the API URL:

```bash
grep -r "vote-staging" dist/ || echo "No staging URLs in prod build — correct!"
grep -r "vote.php" dist/ | head -5
```

Expected: No `vote-staging.php` references in the prod build. Only `vote.php`.

---

## Task 6: Deploy PHP files to OVH

**Step 1: Upload via FTP**

```bash
lftp -u YOUR_FTP_USER,YOUR_FTP_PASS YOUR_FTP_HOST <<EOF
put api/vote.php -o api/vote.php
put api/vote-staging.php -o api/vote-staging.php
exit
EOF
```

Or use FileZilla / OVH file manager to upload both files to the `api/` directory.

**Step 2: Verify staging endpoint directly**

```bash
curl -i "https://api.jeromeabel.net/vote-staging.php?comics=001,002"
```

Expected: 200 OK with counts from the `votes-staging` table.

**Step 3: Verify prod endpoint still works**

```bash
curl -i "https://api.jeromeabel.net/vote.php?comics=001,002"
```

Expected: 200 OK with counts from the `votes` (prod) table.
