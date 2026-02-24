# Staging Design: Single Database, Two Tables

> Date: 2026-02-24

## Context

The vote system uses one MySQL database (`jeromeabdatab01`) on OVH with a `votes` table for production. A `votes-staging` table already exists with the same schema and test data. We need the Astro dev server to hit the staging table so local development doesn't pollute production data.

## Approach: Shared logic with staging wrapper

Two PHP files on OVH, one source of truth for the API logic.

### File structure (OVH)

```
api/
├── vote.php           ← main logic, reads $TABLE and $ALLOWED_ORIGINS variables
├── vote-staging.php   ← sets variables, then requires vote.php
└── .htaccess
```

### `vote-staging.php` (new file)

```php
<?php
$TABLE = 'votes-staging';
$ALLOWED_ORIGINS = [
    'https://leconceptdelapreuve.jeromeabel.net',
    'http://localhost:4321',
];
require __DIR__ . '/vote.php';
```

### `vote.php` changes

1. **Table name**: Replace hardcoded `'votes'` with a variable:

   ```php
   $TABLE = $TABLE ?? 'votes';
   ```

   All SQL queries use `$TABLE` instead of the literal `'votes'`.

2. **CORS origins**: Replace single-origin check with array:

   ```php
   $ALLOWED_ORIGINS = $ALLOWED_ORIGINS ?? ['https://leconceptdelapreuve.jeromeabel.net'];
   $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

   if (in_array($origin, $ALLOWED_ORIGINS, true)) {
       header("Access-Control-Allow-Origin: $origin");
       header('Access-Control-Allow-Credentials: true');
   }
   ```

### `src/scripts/vote.ts` changes

Add environment-based URL switching:

```ts
const API_URL = import.meta.env.DEV
  ? "https://api.jeromeabel.net/vote-staging.php"
  : "https://api.jeromeabel.net/vote.php";
```

Replace the two hardcoded `https://api.jeromeabel.net/vote.php` references with `API_URL`.

## How PHP scope sharing works

PHP's `require` shares the calling script's variable scope. When `vote-staging.php` sets `$TABLE` then requires `vote.php`, the variable is already defined — `$TABLE ?? 'votes'` preserves it. Direct calls to `vote.php` get the default `'votes'` (prod). No globals or constants needed.

## CORS strategy

- **Production** (`vote.php` called directly): Only allows `https://leconceptdelapreuve.jeromeabel.net`
- **Staging** (`vote-staging.php`): Also allows `http://localhost:4321` for local dev

This keeps prod strict while enabling local development against the staging table.

## What doesn't change

- Database schema — `votes-staging` table already exists
- Cookie behavior — same domain, same cookie
- OVH hosting config — no new subdomains needed
- Deployment — FTP upload of two files instead of one
