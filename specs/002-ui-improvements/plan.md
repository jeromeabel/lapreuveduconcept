# UI Improvements & Comic Layout — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the comic site with Space Mono typography, responsive `<Picture>`-based comic reader, and an action panel (date, share, permalink).

**Architecture:** Convention-based asset structure (`cover.png`, `page-1.png`, `page-2.png` per comic). Schema adds `cover` + `pages` fields. `<Picture>` component serves avif/webp/png. Share uses Web Share API with social links fallback.

**Tech Stack:** Astro 5, Tailwind CSS v4, `@fontsource/space-mono`, `astro:assets` `<Picture>` component.

---

## Task 1: Install Space Mono Font

**Files:**
- Modify: `package.json`
- Modify: `src/styles/global.css`

**Step 1: Install the font package**

Run:
```bash
pnpm add @fontsource/space-mono
```

**Step 2: Import font and configure Tailwind theme**

In `src/styles/global.css`, add the font import and override the default font:

```css
@import "@fontsource/space-mono/400.css";
@import "@fontsource/space-mono/700.css";
@import "tailwindcss";
@plugin '@tailwindcss/typography';

@theme {
  --font-sans: "Space Mono", monospace;
  --font-mono: "Space Mono", monospace;
}
```

Note: `@fontsource` imports must come before `@import "tailwindcss"` so the `@font-face` rules are available when Tailwind processes.

**Step 3: Verify in browser**

Run: `pnpm dev`
Expected: All text on site renders in Space Mono.

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/styles/global.css
git commit -m "feat: add Space Mono font via @fontsource"
```

---

## Task 2: Update Content Schema (cover + pages)

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/content/comics/001-tocards.md`
- Rename: `src/assets/comics/001-tocards/all.png` → keep as-is (it becomes `cover.png`)

**Step 1: Rename asset files to match convention**

```
src/assets/comics/001-tocards/
├── all.png   → rename to cover.png
├── page-1.png  (already correct)
└── page-2.png  (already correct)
```

Run:
```bash
mv src/assets/comics/001-tocards/all.png src/assets/comics/001-tocards/cover.png
```

**Step 2: Update schema in `src/content.config.ts`**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const comics = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/comics' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			date: z.date(),
			cover: image(),
			pages: z.array(image()),
			alt: z.string(),
		}),
});

export const collections = { comics };
```

**Step 3: Update frontmatter in `src/content/comics/001-tocards.md`**

```md
---
title: "Tocards"
date: 2026-02-07
cover: ../../assets/comics/001-tocards/cover.png
pages:
  - ../../assets/comics/001-tocards/page-1.png
  - ../../assets/comics/001-tocards/page-2.png
alt: "Bande de tocards"
---
```

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no schema validation errors.

**Step 5: Commit**

```bash
git add src/content.config.ts src/content/comics/001-tocards.md src/assets/comics/001-tocards/
git commit -m "feat: update comic schema to cover + pages convention"
```

---

## Task 3: Update Header — Centered Title

**Files:**
- Modify: `src/components/Header.astro`

**Step 1: Restyle Header**

```astro
<header class="py-12 text-center">
	<a
		href="/"
		class="text-xl font-bold tracking-tight text-zinc-900 hover:text-zinc-600"
	>
		Le concept de la preuve
	</a>
</header>
```

Changes from current: remove `border-b`, center text, increase vertical padding (`py-6` → `py-12`), bump size to `text-xl`.

**Step 2: Verify in browser**

Run: `pnpm dev`
Expected: Title is centered with generous whitespace, no bottom border.

**Step 3: Commit**

```bash
git add src/components/Header.astro
git commit -m "feat: center header with generous spacing"
```

---

## Task 4: Create ActionPanel Component

**Files:**
- Create: `src/components/ActionPanel.astro`

**Step 1: Create the component**

The ActionPanel accepts `date`, `slug`, and `title` props. It shows:
- Formatted date (DD/MM/YYYY)
- Share button (Web Share API with social links fallback)
- Permalink

```astro
---
interface Props {
	date: Date;
	slug: string;
	title: string;
}

const { date, slug, title } = Astro.props;
const formattedDate = date.toLocaleDateString('fr-FR', {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});
const permalink = new URL(`/comics/${slug}`, Astro.site).href;
---

<div class="flex flex-wrap items-center gap-4 py-4 text-sm text-zinc-600">
	<time datetime={date.toISOString()}>{formattedDate}</time>

	<span class="text-zinc-500">|</span>

	<!-- Share: Web Share API with social links fallback -->
	<share-button class="contents" data-title={title} data-url={permalink}>
		<button type="button" class="hover:text-zinc-900 js-share-native hidden">
			Partager
		</button>
		<span class="js-share-fallback flex gap-3">
			<a
				href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(permalink)}`}
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-zinc-900"
			>
				X
			</a>
			<a
				href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(permalink)}`}
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-zinc-900"
			>
				Facebook
			</a>
		</span>
	</share-button>

	<span class="text-zinc-500">|</span>

	<a href={`/comics/${slug}`} class="hover:text-zinc-900">Permalien</a>
</div>

<script>
	class ShareButton extends HTMLElement {
		connectedCallback() {
			if (!navigator.share) return;

			const native = this.querySelector('.js-share-native') as HTMLElement;
			const fallback = this.querySelector('.js-share-fallback') as HTMLElement;

			native?.classList.remove('hidden');
			fallback?.classList.add('hidden');

			native?.addEventListener('click', () => {
				navigator.share({
					title: this.dataset.title,
					url: this.dataset.url,
				});
			});
		}
	}
	customElements.define('share-button', ShareButton);
</script>
```

**Step 2: Verify in browser**

Run: `pnpm dev`
Expected: On mobile (or in DevTools mobile simulation), the "Partager" button appears. On desktop, the X/Facebook links show.

**Step 3: Commit**

```bash
git add src/components/ActionPanel.astro
git commit -m "feat: add ActionPanel with share, date, permalink"
```

---

## Task 5: Update Index Page — Comic Reader Layout

**Files:**
- Modify: `src/pages/index.astro`

**Step 1: Rewrite index.astro with Picture component and grid layout**

```astro
---
import { getCollection } from 'astro:content';
import { Picture } from 'astro:assets';
import Layout from '../layouts/Layout.astro';
import ActionPanel from '../components/ActionPanel.astro';

const comics = await getCollection('comics');
const latestComic = comics
	.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
	.at(0);
---

<Layout>
	{latestComic ? (
		<article>
			<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
				{latestComic.data.pages.map((page, i) => (
					<Picture
						src={page}
						formats={['avif', 'webp']}
						alt={`${latestComic.data.alt} — page ${i + 1}`}
						class="w-full h-auto"
						loading={i === 0 ? 'eager' : 'lazy'}
					/>
				))}
			</div>
			<ActionPanel
				date={latestComic.data.date}
				slug={latestComic.id}
				title={latestComic.data.title}
			/>
		</article>
	) : (
		<p class="text-zinc-600">Aucune bande dessinée pour le moment.</p>
	)}
</Layout>
```

Key decisions:
- `grid-cols-1` on mobile (stacked), `md:grid-cols-2` on desktop (side-by-side).
- `gap-2` keeps pages visually connected.
- First page loads eagerly, second lazily.
- `cover` is not displayed on the homepage — it's for og:image/meta tags (Task 6).

**Step 2: Verify in browser at multiple widths**

Run: `pnpm dev`
Expected:
- Mobile (<768px): Pages stack vertically, full width.
- Desktop (≥768px): Pages side by side, small gap.
- ActionPanel below with date, share links, permalink.

**Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: responsive comic reader with Picture and ActionPanel"
```

---

## Task 6: Add Open Graph Meta with Cover Image

**Files:**
- Modify: `src/layouts/Layout.astro`

**Step 1: Add optional og props to Layout**

```astro
---
import Footer from '../components/Footer.astro';
import Header from '../components/Header.astro';
import '../styles/global.css';

interface Props {
	title?: string;
	description?: string;
	ogImage?: string;
}

const {
	title = 'Le concept de la preuve',
	description = 'Bande dessinée par Jérôme Abel',
	ogImage,
} = Astro.props;
---

<!doctype html>
<html lang="fr">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width" />
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<link rel="icon" href="/favicon.ico" />
		<meta name="generator" content={Astro.generator} />
		<title>{title}</title>
		<meta name="description" content={description} />
		<meta property="og:title" content={title} />
		<meta property="og:description" content={description} />
		{ogImage && <meta property="og:image" content={ogImage} />}
	</head>
	<body class="min-h-screen bg-white text-zinc-900 font-sans">
		<div class="mx-auto flex min-h-screen max-w-7xl flex-col px-4">
			<Header />
			<main class="flex-1 py-10">
				<slot />
			</main>
			<Footer />
		</div>
	</body>
</html>
```

**Step 2: Pass cover image from index.astro**

Add to `index.astro`'s `<Layout>` tag:

```astro
<Layout ogImage={latestComic?.data.cover.src}>
```

**Step 3: Verify**

Run: `pnpm build && pnpm preview`
Inspect HTML source: `<meta property="og:image" content="...cover...">` should be present.

**Step 4: Commit**

```bash
git add src/layouts/Layout.astro src/pages/index.astro
git commit -m "feat: add Open Graph meta tags with cover image"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Space Mono font | `global.css`, `package.json` |
| 2 | Schema: cover + pages | `content.config.ts`, `001-tocards.md`, assets |
| 3 | Centered header | `Header.astro` |
| 4 | ActionPanel component | `ActionPanel.astro` (new) |
| 5 | Comic reader layout | `index.astro` |
| 6 | OG meta with cover | `Layout.astro`, `index.astro` |
