
## Plan B — OVH PHP + MySQL (subdomain split)

### Idea

Deploy a single PHP file on OVH shared hosting behind a subdomain (`api.your-domain.com`). PHP has no cold start (always-warm via php-fpm). MySQL is co-located on the same machine — DB round-trip is <1ms.

The static site stays on Netlify. The domain is bought from OVH. Both the main site and the API share the same root domain, so cookies work with `SameSite=Lax` — no third-party cookie issues.

### Architecture

```
your-domain.com (Netlify CDN — static site, unchanged)
  └─ <script> → fetch('https://api.your-domain.com/vote.php')

api.your-domain.com (OVH shared hosting)
  └─ PHP (php-fpm, always warm)
       └─ MySQL (localhost, same server)
```

### Prerequisites

- OVH domain with a Web Hosting plan (includes MySQL + PHP + FTP)
- Your static site deployed on Netlify with a custom domain (`your-domain.com`)
- FTP credentials from OVH control panel (Web Hosting → FTP - SSH)
- MySQL credentials from OVH control panel (Web Hosting → Databases)

---

### Step 1 — DNS: add the `api` subdomain

First, check where your DNS is managed.

**Go to OVH Control Panel → Domain → DNS Servers.**

- If nameservers are `dnsXX.ovh.net` → OVH manages DNS. Add the record in OVH.
- If nameservers are `dns1.p01.nsone.net` (Netlify) → Netlify manages DNS. Add the record in Netlify.


**Add this DNS record** (in whichever panel manages your zone):

```
Type:  A
Name:  api
Value: [your OVH hosting IP]
TTL:   3600
```

Find your OVH hosting IP in: OVH Control Panel → Web Hosting → General Information → IPv4.

The existing records for `your-domain.com` (pointing to Netlify) stay untouched.

**Then declare the subdomain in OVH hosting:**

OVH Control Panel → Web Hosting → Multisite → Add a domain → `api.your-domain.com`
- Root folder: `api/`
- Enable SSL (Let's Encrypt)

This tells OVH's web server to serve files from the `api/` directory when requests arrive at `api.your-domain.com`.

Wait for DNS propagation (up to 24h, usually 15min). Verify with:

```bash
dig api.your-domain.com +short
# Should return your OVH hosting IP
```

---

### Step 2 — MySQL: create the votes table

Go to OVH Control Panel → Web Hosting → Databases → phpMyAdmin.

Or connect via CLI if SSH is available:

```bash
mysql -h YOUR_DB_HOST -u YOUR_USER -p YOUR_DB
```

Note: OVH MySQL host is NOT `localhost` — it's something like `your-db.mysql.db`. Check the Databases panel for the exact hostname.

```sql
CREATE TABLE votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comic_id VARCHAR(100) NOT NULL,
  visitor_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vote (comic_id, visitor_id),
  INDEX idx_comic_id (comic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

The composite unique index enforces one vote per visitor per comic at the database level — same pattern as your current Astro DB setup.

---

### Step 3 — PHP: create the API endpoint

Create a file `vote.php`. This single file handles everything: CORS, cookies, reading counts, toggling votes.

```php
<?php
// vote.php

// ------------------------------------------------------------------
// CORS — required because api.your-domain.com ≠ your-domain.com
// Even though they share a root domain, the browser treats them
// as different origins. But cookies work fine with SameSite=Lax
// because they share the same registrable domain.
// ------------------------------------------------------------------

$allowed_origin = 'https://your-domain.com';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin === $allowed_origin) {
    header("Access-Control-Allow-Origin: $allowed_origin");
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ------------------------------------------------------------------
// Database connection
// ------------------------------------------------------------------

$pdo = new PDO(
    'mysql:host=YOUR_DB_HOST;dbname=YOUR_DB;charset=utf8mb4',
    'YOUR_USER',
    'YOUR_PASS',
    [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]
);

// ------------------------------------------------------------------
// Visitor identity — httpOnly cookie on the shared root domain
//
// Because your-domain.com and api.your-domain.com share the same
// registrable domain, a cookie set with domain=.your-domain.com
// is sent on requests to both. SameSite=Lax is sufficient —
// no third-party cookie issues, no browser restrictions.
// ------------------------------------------------------------------

$visitorId = $_COOKIE['visitor_id'] ?? null;

if (!$visitorId) {
    $visitorId = bin2hex(random_bytes(16));
    setcookie('visitor_id', $visitorId, [
        'expires'  => time() + 365 * 24 * 60 * 60,
        'path'     => '/',
        'domain'   => '.your-domain.com',   // shared across subdomains
        'secure'   => true,
        'httponly'  => true,
        'samesite' => 'Lax',                // Lax works (same root domain)
    ]);
}

// ------------------------------------------------------------------
// GET /vote.php?comics=slug1,slug2,slug3
// Returns counts + which comics this visitor voted for
// ------------------------------------------------------------------

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $comicIds = array_filter(explode(',', $_GET['comics'] ?? ''));

    if (empty($comicIds)) {
        echo json_encode(['counts' => new \stdClass(), 'voted' => []]);
        exit;
    }

    $placeholders = implode(',', array_fill(0, count($comicIds), '?'));

    // Query 1: vote counts per comic
    $stmt = $pdo->prepare(
        "SELECT comic_id, COUNT(*) AS cnt
         FROM votes
         WHERE comic_id IN ($placeholders)
         GROUP BY comic_id"
    );
    $stmt->execute($comicIds);

    $counts = [];
    foreach ($stmt->fetchAll() as $row) {
        $counts[$row['comic_id']] = (int) $row['cnt'];
    }

    // Query 2: which comics did this visitor vote for?
    $stmt2 = $pdo->prepare(
        "SELECT comic_id
         FROM votes
         WHERE comic_id IN ($placeholders) AND visitor_id = ?"
    );
    $stmt2->execute([...$comicIds, $visitorId]);
    $voted = array_column($stmt2->fetchAll(), 'comic_id');

    echo json_encode(['counts' => (object) $counts, 'voted' => $voted]);
    exit;
}

// ------------------------------------------------------------------
// POST /vote.php  { "comicId": "slug" }
// Toggles vote: insert if not exists, delete if exists
// Returns new count + voted state
// ------------------------------------------------------------------

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $comicId = $body['comicId'] ?? null;

    if (!$comicId || !is_string($comicId) || strlen($comicId) > 100) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid comicId']);
        exit;
    }

    // Check existing vote
    $check = $pdo->prepare(
        'SELECT id FROM votes WHERE comic_id = ? AND visitor_id = ? LIMIT 1'
    );
    $check->execute([$comicId, $visitorId]);

    if ($check->fetch()) {
        // Already voted → remove
        $pdo->prepare('DELETE FROM votes WHERE comic_id = ? AND visitor_id = ?')
            ->execute([$comicId, $visitorId]);
        $voted = false;
    } else {
        // Not voted → insert
        $pdo->prepare('INSERT INTO votes (comic_id, visitor_id) VALUES (?, ?)')
            ->execute([$comicId, $visitorId]);
        $voted = true;
    }

    // Return fresh count
    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM votes WHERE comic_id = ?');
    $countStmt->execute([$comicId]);

    echo json_encode([
        'count' => (int) $countStmt->fetchColumn(),
        'voted' => $voted,
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
```

---

### Step 4 — Deploy via FTP

Connect to OVH FTP (credentials in OVH Control Panel → Web Hosting → FTP - SSH):

```bash
# Using lftp (more reliable than ftp)
lftp -u YOUR_FTP_USER,YOUR_FTP_PASS YOUR_FTP_HOST

# Upload to the api/ directory (matches the Multisite root folder)
> mkdir -p api
> put vote.php -o api/vote.php
> exit
```

Or use FileZilla / OVH's file manager in the control panel.

**Verify the endpoint:**

```bash
# Should return empty counts
curl -i https://api..../vote.php?comics=test

# Should set a cookie and toggle a vote
curl -i -X POST https://api..../vote.php   -H "Content-Type: application/json"   -H "Origin: https://leconceptdelapreuve....."   -d '{"comicId":"test"}'
```

---

### Step 5 — Client-side: update Astro script

Replace your current Netlify function fetch calls. The optimistic UI pattern stays identical — only the fetch target changes.

```ts
const API_BASE = "https://api.your-domain.com/vote.php";

// Load all counts + visitor votes in one GET
async function loadVotes(comicIds: string[]): Promise<{
  counts: Record<string, number>;
  voted: string[];
}> {
  const res = await fetch(
    `${API_BASE}?comics=${comicIds.join(",")}`,
    { credentials: "include" }  // send the shared cookie
  );
  if (!res.ok) throw new Error(`Vote API: ${res.status}`);
  return res.json();
}

// Toggle a single vote
async function toggleVote(comicId: string): Promise<{
  count: number;
  voted: boolean;
}> {
  const res = await fetch(API_BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comicId }),
  });
  if (!res.ok) throw new Error(`Vote API: ${res.status}`);
  return res.json();
}
```

`credentials: "include"` is required because `api.your-domain.com` is a different origin from `your-domain.com` — even though they share the root domain. The browser sends the cookie because it's set on `.your-domain.com` and `SameSite=Lax` allows it.

---

### Step 6 — Clean up Astro

Remove the Netlify function and Turso dependencies:

- Delete `src/pages/api/vote.ts`
- Remove Turso env vars from Netlify (`ASTRO_DB_REMOTE_URL`, `ASTRO_DB_APP_TOKEN`)
- Remove `--remote` from the build command if no other server routes remain
- Remove `@astrojs/db` and Turso packages from `package.json` if unused elsewhere
- The site becomes fully static — no `prerender = false` routes

---

### Deployment workflow (ongoing)

```
Astro static site                    PHP API
──────────────                       ───────
git push → Netlify auto-deploy       Edit vote.php → FTP upload
Branch previews work as before       One file, rarely changes
```

The PHP file is standalone — it changes only if you modify the vote API logic. For the rare updates, a manual FTP upload is fine. If you want automation later, OVH Pro hosting supports SSH + Git, or you can add a simple GitHub Action:

```yaml
# .github/workflows/deploy-api.yml (optional, for later)
name: Deploy API
on:
  push:
    paths: ['api/vote.php']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: SamKirkland/FTP-Deploy-Action@v4
        with:
          server: ${{ secrets.OVH_FTP_HOST }}
          username: ${{ secrets.OVH_FTP_USER }}
          password: ${{ secrets.OVH_FTP_PASS }}
          local-dir: ./api/
          server-dir: ./api/
```

---

### What to measure

| Metric | Target | How to test |
|--------|--------|-------------|
| GET response time (batch counts) | < 50ms | DevTools Network tab, or `curl -w '%{time_total}'` |
| POST response time (toggle vote) | < 50ms | Same |
| Time to vote counts visible on page load | < 200ms | DevTools Performance tab |
| Cookie behavior | Works in all browsers | Test Chrome, Safari, Firefox |
| DNS resolution for `api` subdomain | < 50ms | `dig api.your-domain.com` |

---

### Why cookies work without issues

This is the key advantage of the subdomain approach over the original plan:

```
                   ┌─── your-domain.com (Netlify)
.your-domain.com ──┤
                   └─── api.your-domain.com (OVH)
```

A cookie set with `domain=.your-domain.com`:
- Is sent to both `your-domain.com` and `api.your-domain.com`
- Works with `SameSite=Lax` (same registrable domain)
- Not affected by third-party cookie restrictions
- Keeps `httpOnly` protection (JS can't read it)

No `SameSite=None` needed. No browser compatibility issues. Same security model as your current Astro cookie approach.

---

### Trade-offs

| Gain | Cost |
|------|------|
| No cold start (php-fpm always warm) | One PHP file to maintain outside Astro codebase |
| Co-located DB, <1ms queries | FTP deployment (or optional GitHub Action) |
| httpOnly cookie, no third-party issues | Two hosting targets (Netlify + OVH) |
| No JS dependency added to client | MySQL on OVH shared hosting (adequate but not premium) |
| Zero additional cost (existing OVH plan) | |
| Site becomes fully static again | |

### Expected latency: 20–80ms

---

## Comparison

| | Current (Netlify → Turso) | Plan A: Supabase Direct | Plan B: OVH PHP + MySQL |
|---|---|---|---|
| Cold start | 100–300ms | None | None |
| DB round-trip | 50–150ms | 30–100ms | <5ms |
| **Expected total** | **~500ms** | **~80–200ms** | **~20–80ms** |
| Cookie security | httpOnly ✓ | localStorage ✗ | httpOnly ✓ (same-domain) |
| Third-party cookie risk | None | N/A | None (subdomain) |
| Deployment | `git push` | `git push` + Supabase | `git push` + FTP |
| Extra cost | None | Free tier | None (existing OVH) |
| Code ecosystem | TypeScript | TypeScript + SQL | TypeScript + PHP |
| Site fully static | No (1 server route) | Yes | Yes |
| Client-side dependency | None | supabase-js (~40KB) | None |

## Recommended approach

**Plan B (OVH PHP + MySQL)** is the strongest option given your existing OVH setup. It delivers the lowest latency (co-located DB), keeps httpOnly cookies working cleanly via subdomain, adds zero client-side dependencies, and costs nothing extra. The only trade-off is maintaining one PHP file deployed via FTP — but it rarely changes.
