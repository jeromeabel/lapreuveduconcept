## 1. Database switching: dev vs prod

The PHP script has hardcoded DB credentials at lines 134–143. The cleanest approach for OVH shared hosting (where you can't easily set env vars) is a config file that `vote.php` reads.

### ★ Insight

- OVH shared hosting doesn't support `.env` files natively — PHP has no built-in dotenv. A plain `config.php` returning an array is the idiomatic OVH pattern.
- The config file should live outside the `api/` web root (or be `.htaccess`-protected) so it's not publicly accessible.
- Switching by `HTTP_HOST` is reliable here because OVH's Multisite routing guarantees the hostname matches the subdomain you configured.

---

### Suggested structure

```

(OVH FTP root)
├── api/
│   ├── vote.php          ← serves requests
│   └── .htaccess         ← deny access to config
├── config.php            ← DB credentials (outside web root)

````

But the switching logic is a design decision with trade-offs where your input matters. There are two natural approaches:

| Approach   | How it works                                              | Trade-off                                      |
|------------|-----------------------------------------------------------|-----------------------------------------------|
| Host-based | api.jeromeabel.net → prod, api-dev.jeromeabel.net → dev | Requires a second OVH Multisite subdomain     |
| File-based | A config.php with an `'env' => 'dev'` flag you flip      | Simpler, but risk of forgetting to flip back  |

Since you chose Approach A (two databases), I'd recommend host-based switching — you create a second Multisite entry `api-dev.jeromeabel.net` pointing to the same `api/` folder, and the PHP reads `$_SERVER['HTTP_HOST']` to pick the database. No risk of deploying dev config to prod.

---

### `config.php`

```php
<?php
// config.php — outside web root, not publicly accessible
return [
    'api.jeromeabel.net' => [
        'host' => 'your-db-host.mysql.db',
        'name' => 'vote_prod',
        'user' => 'prod_user',
        'pass' => 'prod_pass',
    ],
    'api-dev.jeromeabel.net' => [
        'host' => 'your-db-host.mysql.db',
        'name' => 'vote_dev',
        'user' => 'dev_user',
        'pass' => 'dev_pass',
    ],
];
````

---

### `vote.php` (replace hardcoded PDO block)

```php
// Database connection — env selected by hostname
$configs = require __DIR__ . '/../config.php';
$host = $_SERVER['HTTP_HOST'] ?? '';
$dbConf = $configs[$host] ?? null;

if (!$dbConf) {
    http_response_code(500);
    echo json_encode(['error' => 'Unknown host']);
    exit;
}

$pdo = new PDO(
    "mysql:host={$dbConf['host']};dbname={$dbConf['name']};charset=utf8mb4",
    $dbConf['user'],
    $dbConf['pass'],
    [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]
);
```

---

### Astro side (`vote.ts`)

Point to the correct API during development:

```ts
const API_BASE = import.meta.env.DEV
  ? "https://api-dev.jeromeabel.net/vote.php"
  : "https://api.jeromeabel.net/vote.php";
```

This way:

* `pnpm dev` hits the dev database
* `pnpm build` targets prod
* No manual switching needed

---

## 2. Migrating data from Turso

For the one-time data migration:

### 1. Export from Turso

```bash
turso db shell your-db-name \
  "SELECT comic_id, visitor_id, created_at FROM Vote;" \
  --output csv > turso-votes.csv
```

### 2. Generate INSERT statements (alternative)

```bash
turso db shell your-db-name \
  "SELECT printf('INSERT INTO votes (comic_id, visitor_id, created_at) VALUES (''%s'', ''%s'', ''%s'');', comicId, visitorId, createdAt) FROM Vote;" \
  > import.sql
```

### 3. Import into both databases

```bash
mysql -h your-db-host -u prod_user -p vote_prod < import.sql
mysql -h your-db-host -u dev_user -p vote_dev  < import.sql
```

---

### Column name mapping note

Your Turso schema likely uses camelCase (`comicId`, `visitorId`) while the MySQL schema uses snake_case (`comic_id`, `visitor_id`). The SQL above handles that with aliasing.

---

Would you like to update `vote.ts` now with the `API_BASE` switching, or set up the OVH side first?
