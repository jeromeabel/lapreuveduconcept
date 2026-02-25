# Reading Experience Prototypes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build 3 separate prototype pages (`/reading/snap`, `/reading/slider`, `/reading/magazine`) to explore alternative comic strip reading experiences.

**Architecture:** Each prototype is a standalone Astro page that loads the full comic collection via `getCollection('comics')` and renders comics through a prototype-specific card component. All card components reuse the existing `ComicImage.astro`, `VoteButton.astro`, and `ShareActions.astro`. No external JS libraries — pure CSS + vanilla JS only.

**Tech Stack:** Astro v5, Tailwind CSS v4 (Vite plugin), CSS scroll-snap, IntersectionObserver API, CSS custom properties for scroll progress.

**Spec:** `specs/009-reading-experience/plan.md`

---

## Task 1: Shared data helper and reading index page

**Files:**
- Create: `src/pages/reading/index.astro`

This page serves as a hub linking to all 3 prototypes for easy navigation during testing.

**Step 1: Create the reading index page**

```astro
---
import Layout from '../../layouts/Layout.astro';
---

<Layout title="Reading Prototypes">
  <section class="py-12">
    <h1 class="text-2xl font-semibold mb-8">Reading Experience Prototypes</h1>
    <p class="text-zinc-600 mb-8 max-w-prose">
      Three different approaches to reading comic strips. Compare them to find the best experience.
    </p>
    <nav class="grid gap-6 max-w-xl">
      <a href="/reading/snap" class="block p-6 border border-zinc-300 hover:border-zinc-500 transition-colors">
        <h2 class="text-lg font-semibold mb-1">Snap</h2>
        <p class="text-sm text-zinc-600">Full-viewport scroll snap. One comic per screen. Horizontal panel swipe on mobile.</p>
      </a>
      <a href="/reading/slider" class="block p-6 border border-zinc-300 hover:border-zinc-500 transition-colors">
        <h2 class="text-lg font-semibold mb-1">Slider</h2>
        <p class="text-sm text-zinc-600">Horizontal carousel. Arrow keys and swipe navigation. Page-turner metaphor.</p>
      </a>
      <a href="/reading/magazine" class="block p-6 border border-zinc-300 hover:border-zinc-500 transition-colors">
        <h2 class="text-lg font-semibold mb-1">Magazine</h2>
        <p class="text-sm text-zinc-600">Vertical feed with proximity snap, parallax depth, and sticky card stacking.</p>
      </a>
    </nav>
  </section>
</Layout>
```

**Step 2: Run dev server and verify**

Run: `pnpm dev`
Navigate to: `http://localhost:4321/reading/`
Expected: Hub page with 3 links (each 404s for now — that's fine).

**Step 3: Commit**

```bash
git add src/pages/reading/index.astro
git commit -m "feat(reading): add prototype hub page at /reading/"
```

---

## Task 2: Snap Prototype — SnapCard component

**Files:**
- Create: `src/components/reading/SnapCard.astro`

The snap card renders a single comic inside a full-viewport snap section. Desktop: both panels side-by-side. Mobile: horizontal scroll-snap between panels with dot indicators.

**Step 1: Create the SnapCard component**

```astro
---
import type { CollectionEntry } from 'astro:content';
import ComicImage from '../ComicImage.astro';
import VoteButton from '../VoteButton.astro';
import ShareActions from '../ShareActions.astro';

interface Props {
  comic: CollectionEntry<'comics'>;
  index: number;
  total: number;
  eager?: boolean;
}

const { comic, index, total, eager = false } = Astro.props;
const formattedDate = comic.data.date.toLocaleDateString('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
---

<section
  class="snap-section h-dvh snap-start flex flex-col items-center justify-center px-4 md:px-8"
  aria-label={`${comic.data.title} — ${index + 1} sur ${total}`}
>
  <!-- Panels container -->
  <div class="w-full max-w-5xl">
    <!-- Desktop: side-by-side grid -->
    <div class="hidden md:grid grid-cols-2 gap-4 max-h-[70dvh]">
      {comic.data.pages.map((page, i) => (
        <div class="flex items-center justify-center overflow-hidden">
          <ComicImage
            src={page}
            alt={`${comic.data.alt} — page ${i + 1}`}
            eager={eager && i < 2}
          />
        </div>
      ))}
    </div>

    <!-- Mobile: horizontal scroll-snap -->
    <div class="md:hidden snap-panels flex overflow-x-auto snap-x snap-mandatory gap-4 scrollbar-hide">
      {comic.data.pages.map((page, i) => (
        <div class="snap-panel w-full flex-shrink-0 snap-center flex items-center justify-center">
          <ComicImage
            src={page}
            alt={`${comic.data.alt} — page ${i + 1}`}
            eager={eager && i < 2}
          />
        </div>
      ))}
    </div>

    <!-- Mobile dot indicators -->
    <div class="md:hidden flex justify-center gap-2 mt-3" aria-hidden="true">
      {comic.data.pages.map((_, i) => (
        <span class="snap-dot size-2 rounded-full bg-zinc-300 transition-colors" data-index={i} />
      ))}
    </div>
  </div>

  <!-- Action bar -->
  <div class="flex items-center gap-x-3 mt-4 text-sm text-zinc-500 w-full max-w-5xl">
    <a
      href={`/${comic.id}`}
      class="no-underline text-zinc-700 hover:text-zinc-900"
    >
      {comic.id} · {comic.data.title}
    </a>
    <time datetime={comic.data.date.toISOString()} class="text-zinc-400">{formattedDate}</time>
    <span class="ml-auto text-xs text-zinc-400">{index + 1} / {total}</span>
    <div class="flex shrink-0 gap-3">
      <VoteButton slug={comic.id} />
      <ShareActions slug={comic.id} title={comic.data.title} />
    </div>
  </div>
</section>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
</style>
```

**Step 2: Commit**

```bash
git add src/components/reading/SnapCard.astro
git commit -m "feat(reading): add SnapCard component for full-viewport snap prototype"
```

---

## Task 3: Snap Prototype — Page and scroll-snap JS

**Files:**
- Create: `src/pages/reading/snap.astro`

The page wires up the full-viewport snap container, keyboard navigation, and mobile dot-indicator tracking.

**Step 1: Create the snap page**

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../../layouts/Layout.astro';
import SnapCard from '../../components/reading/SnapCard.astro';

const comics = await getCollection('comics');
const sortedComics = comics.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
---

<Layout title="Reading — Snap" earlyVoteIds={sortedComics.map(c => c.id)}>
  <div class="snap-container h-dvh overflow-y-auto snap-y snap-mandatory -mx-[var(--page-pad)]">
    {sortedComics.map((comic, index) => (
      <SnapCard
        comic={comic}
        index={index}
        total={sortedComics.length}
        eager={index === 0}
      />
    ))}
  </div>
</Layout>

<style>
  .snap-container {
    scroll-snap-type: y mandatory;
  }

  @media (prefers-reduced-motion: reduce) {
    .snap-container {
      scroll-snap-type: y proximity;
    }
  }
</style>

<script>
  // Keyboard navigation: arrow down / space → next snap section
  const container = document.querySelector('.snap-container');
  if (container) {
    document.addEventListener('keydown', (e) => {
      const sections = container.querySelectorAll('.snap-section');
      if (!sections.length) return;

      // Find the currently visible section
      const containerRect = container.getBoundingClientRect();
      let currentIndex = 0;
      for (let i = 0; i < sections.length; i++) {
        const rect = sections[i].getBoundingClientRect();
        if (Math.abs(rect.top - containerRect.top) < 50) {
          currentIndex = i;
          break;
        }
      }

      if ((e.key === 'ArrowDown' || e.key === ' ') && currentIndex < sections.length - 1) {
        e.preventDefault();
        sections[currentIndex + 1].scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        e.preventDefault();
        sections[currentIndex - 1].scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Mobile dot indicators: track horizontal scroll position
  document.querySelectorAll('.snap-panels').forEach((panel) => {
    const dots = panel.parentElement?.querySelectorAll('.snap-dot');
    if (!dots?.length) return;

    // Set first dot active initially
    dots[0]?.classList.replace('bg-zinc-300', 'bg-zinc-700');

    panel.addEventListener('scroll', () => {
      const scrollLeft = panel.scrollLeft;
      const panelWidth = panel.clientWidth;
      const activeIndex = Math.round(scrollLeft / panelWidth);

      dots.forEach((dot, i) => {
        if (i === activeIndex) {
          dot.classList.replace('bg-zinc-300', 'bg-zinc-700');
        } else {
          dot.classList.replace('bg-zinc-700', 'bg-zinc-300');
        }
      });
    }, { passive: true });
  });
</script>
```

**Step 2: Run dev server and verify**

Run: `pnpm dev`
Navigate to: `http://localhost:4321/reading/snap`
Expected:
- Each comic takes up full viewport height
- Scrolling snaps to one comic at a time
- Arrow down / space navigates forward
- On mobile (resize devtools): horizontal swipe between panels, dot indicators update

**Step 3: Commit**

```bash
git add src/pages/reading/snap.astro
git commit -m "feat(reading): add snap prototype page with keyboard nav and mobile dot indicators"
```

---

## Task 4: Slider Prototype — SliderCard component

**Files:**
- Create: `src/components/reading/SliderCard.astro`

Each slide shows one comic. Desktop: panels side-by-side. Mobile portrait: horizontal snap (same pattern as SnapCard).

**Step 1: Create the SliderCard component**

```astro
---
import type { CollectionEntry } from 'astro:content';
import ComicImage from '../ComicImage.astro';
import VoteButton from '../VoteButton.astro';
import ShareActions from '../ShareActions.astro';

interface Props {
  comic: CollectionEntry<'comics'>;
  index: number;
  total: number;
  eager?: boolean;
}

const { comic, index, total, eager = false } = Astro.props;
const formattedDate = comic.data.date.toLocaleDateString('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
---

<div
  class="slider-slide w-full flex-shrink-0 snap-center flex flex-col items-center justify-center h-full px-4 md:px-12"
  role="group"
  aria-roledescription="slide"
  aria-label={`${index + 1} sur ${total}: ${comic.data.title}`}
>
  <div class="w-full max-w-5xl">
    <!-- Desktop: side-by-side -->
    <div class="hidden md:grid grid-cols-2 gap-4">
      {comic.data.pages.map((page, i) => (
        <ComicImage
          src={page}
          alt={`${comic.data.alt} — page ${i + 1}`}
          eager={eager && i < 2}
        />
      ))}
    </div>

    <!-- Mobile: horizontal snap -->
    <div class="md:hidden slider-panels flex overflow-x-auto snap-x snap-mandatory gap-4 scrollbar-hide">
      {comic.data.pages.map((page, i) => (
        <div class="w-full flex-shrink-0 snap-center">
          <ComicImage
            src={page}
            alt={`${comic.data.alt} — page ${i + 1}`}
            eager={eager && i < 2}
          />
        </div>
      ))}
    </div>
  </div>

  <!-- Caption -->
  <div class="flex items-center gap-x-3 mt-4 text-sm text-zinc-500 w-full max-w-5xl">
    <a href={`/${comic.id}`} class="no-underline text-zinc-700 hover:text-zinc-900">
      {comic.id} · {comic.data.title}
    </a>
    <time datetime={comic.data.date.toISOString()} class="text-zinc-400">{formattedDate}</time>
    <div class="ml-auto flex shrink-0 gap-3">
      <VoteButton slug={comic.id} />
      <ShareActions slug={comic.id} title={comic.data.title} />
    </div>
  </div>
</div>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
</style>
```

**Step 2: Commit**

```bash
git add src/components/reading/SliderCard.astro
git commit -m "feat(reading): add SliderCard component for horizontal carousel prototype"
```

---

## Task 5: Slider Prototype — Page with horizontal navigation

**Files:**
- Create: `src/pages/reading/slider.astro`

The slider page uses CSS `scroll-snap-type: x mandatory` with prev/next buttons, keyboard arrows, touch swipe, and a progress counter.

**Step 1: Create the slider page**

```astro
---
import { getCollection } from 'astro:content';
import { Icon } from 'astro-icon/components';
import Layout from '../../layouts/Layout.astro';
import SliderCard from '../../components/reading/SliderCard.astro';

const comics = await getCollection('comics');
const sortedComics = comics.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
---

<Layout title="Reading — Slider" earlyVoteIds={sortedComics.map(c => c.id)}>
  <div class="slider-wrapper relative h-[calc(100dvh-theme(spacing.32))]">
    <!-- Slides track -->
    <div
      class="slider-track flex overflow-x-auto snap-x snap-mandatory h-full scrollbar-hide"
      role="region"
      aria-roledescription="carousel"
      aria-label="Bande dessinée"
    >
      {sortedComics.map((comic, index) => (
        <SliderCard
          comic={comic}
          index={index}
          total={sortedComics.length}
          eager={index === 0}
        />
      ))}
    </div>

    <!-- Prev / Next buttons -->
    <button
      type="button"
      class="slider-prev absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-md text-zinc-600 hover:text-zinc-900 transition-colors z-10 disabled:opacity-30 disabled:cursor-default"
      aria-label="Précédent"
    >
      <Icon name="carbon:chevron-left" class="size-6" />
    </button>
    <button
      type="button"
      class="slider-next absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-md text-zinc-600 hover:text-zinc-900 transition-colors z-10 disabled:opacity-30 disabled:cursor-default"
      aria-label="Suivant"
    >
      <Icon name="carbon:chevron-right" class="size-6" />
    </button>

    <!-- Progress counter -->
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-zinc-500 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full">
      <span class="slider-current">1</span> / <span class="slider-total">{sortedComics.length}</span>
    </div>
  </div>
</Layout>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
</style>

<script>
  const track = document.querySelector('.slider-track') as HTMLElement;
  const prevBtn = document.querySelector('.slider-prev') as HTMLButtonElement;
  const nextBtn = document.querySelector('.slider-next') as HTMLButtonElement;
  const currentEl = document.querySelector('.slider-current') as HTMLElement;
  const slides = track?.querySelectorAll('.slider-slide');

  if (track && slides?.length) {
    let currentIndex = 0;

    function goTo(index: number) {
      const clamped = Math.max(0, Math.min(index, slides!.length - 1));
      slides![clamped].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      currentIndex = clamped;
      updateUI();
    }

    function updateUI() {
      currentEl.textContent = String(currentIndex + 1);
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex === slides!.length - 1;
    }

    prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
    nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIndex - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentIndex + 1); }
    });

    // Track scroll position to sync counter with touch-swipe
    track.addEventListener('scroll', () => {
      const scrollLeft = track.scrollLeft;
      const slideWidth = track.clientWidth;
      const newIndex = Math.round(scrollLeft / slideWidth);
      if (newIndex !== currentIndex) {
        currentIndex = newIndex;
        updateUI();
      }
    }, { passive: true });

    updateUI();
  }
</script>
```

**Step 2: Run dev server and verify**

Run: `pnpm dev`
Navigate to: `http://localhost:4321/reading/slider`
Expected:
- Comics displayed one at a time in horizontal layout
- Prev/Next buttons navigate between comics
- Arrow left/right keyboard navigation works
- Progress counter updates ("1 / 8", "2 / 8", etc.)
- Touch swipe works on mobile

**Step 3: Commit**

```bash
git add src/pages/reading/slider.astro
git commit -m "feat(reading): add slider prototype page with keyboard and touch navigation"
```

---

## Task 6: Magazine Prototype — MagazineCard component

**Files:**
- Create: `src/components/reading/MagazineCard.astro`

The magazine card renders a sticky-positioned comic that stacks on top of previous cards as you scroll. Images have a parallax CSS custom property slot.

**Step 1: Create the MagazineCard component**

```astro
---
import type { CollectionEntry } from 'astro:content';
import ComicImage from '../ComicImage.astro';
import VoteButton from '../VoteButton.astro';
import ShareActions from '../ShareActions.astro';

interface Props {
  comic: CollectionEntry<'comics'>;
  index: number;
  total: number;
  eager?: boolean;
}

const { comic, index, total, eager = false } = Astro.props;
const formattedDate = comic.data.date.toLocaleDateString('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
---

<section
  class="magazine-section min-h-dvh snap-start flex items-center justify-center py-8"
  aria-label={`${comic.data.title} — ${index + 1} sur ${total}`}
  data-magazine-index={index}
>
  <div class="magazine-card sticky top-8 w-full max-w-5xl mx-auto px-4 md:px-0">
    <article class="bg-white p-6 md:p-12 border border-zinc-300 shadow-lg">
      <!-- Desktop: side-by-side grid with parallax wrapper -->
      <div class="hidden md:grid grid-cols-2 gap-4">
        {comic.data.pages.map((page, i) => (
          <div class="magazine-parallax" style="--parallax-offset: 0px;">
            <ComicImage
              src={page}
              alt={`${comic.data.alt} — page ${i + 1}`}
              eager={eager && i < 2}
            />
          </div>
        ))}
      </div>

      <!-- Mobile: horizontal scroll-snap -->
      <div class="md:hidden magazine-panels flex overflow-x-auto snap-x snap-mandatory gap-4 scrollbar-hide">
        {comic.data.pages.map((page, i) => (
          <div class="w-full flex-shrink-0 snap-center">
            <ComicImage
              src={page}
              alt={`${comic.data.alt} — page ${i + 1}`}
              eager={eager && i < 2}
            />
          </div>
        ))}
      </div>

      <!-- Mobile dot indicators -->
      <div class="md:hidden flex justify-center gap-2 mt-3" aria-hidden="true">
        {comic.data.pages.map((_, i) => (
          <span class="mag-dot size-2 rounded-full bg-zinc-300 transition-colors" data-index={i} />
        ))}
      </div>
    </article>

    <!-- Caption below card -->
    <div class="flex items-center gap-x-3 px-3 md:px-0 pt-3 text-sm text-zinc-500">
      <a href={`/${comic.id}`} class="no-underline text-zinc-700 hover:text-zinc-900">
        {comic.id} · {comic.data.title}
      </a>
      <time datetime={comic.data.date.toISOString()} class="text-zinc-400">{formattedDate}</time>
      <div class="ml-auto flex shrink-0 gap-3">
        <VoteButton slug={comic.id} />
        <ShareActions slug={comic.id} title={comic.data.title} />
      </div>
    </div>
  </div>
</section>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  .magazine-parallax {
    transform: translateY(var(--parallax-offset));
    will-change: transform;
  }

  @media (prefers-reduced-motion: reduce) {
    .magazine-parallax {
      transform: none !important;
    }
  }
</style>
```

**Step 2: Commit**

```bash
git add src/components/reading/MagazineCard.astro
git commit -m "feat(reading): add MagazineCard component with sticky stacking and parallax slot"
```

---

## Task 7: Magazine Prototype — Page with parallax and sticky stacking

**Files:**
- Create: `src/pages/reading/magazine.astro`

The magazine page wires up the proximity snap container, the parallax scroll tracking via IntersectionObserver + scroll listener, and the mobile dot indicators.

**Step 1: Create the magazine page**

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../../layouts/Layout.astro';
import MagazineCard from '../../components/reading/MagazineCard.astro';

const comics = await getCollection('comics');
const sortedComics = comics.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
---

<Layout title="Reading — Magazine" earlyVoteIds={sortedComics.map(c => c.id)}>
  <div class="magazine-container">
    {sortedComics.map((comic, index) => (
      <MagazineCard
        comic={comic}
        index={index}
        total={sortedComics.length}
        eager={index === 0}
      />
    ))}
  </div>
</Layout>

<style>
  .magazine-container {
    scroll-snap-type: y proximity;
  }

  @media (prefers-reduced-motion: reduce) {
    .magazine-container {
      scroll-snap-type: none;
    }
  }
</style>

<script>
  // Parallax: update --parallax-offset based on scroll position
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {
    const parallaxElements = document.querySelectorAll<HTMLElement>('.magazine-parallax');

    const updateParallax = () => {
      for (const el of parallaxElements) {
        const rect = el.getBoundingClientRect();
        const viewportCenter = window.innerHeight / 2;
        const elementCenter = rect.top + rect.height / 2;
        const distance = elementCenter - viewportCenter;
        // Subtle parallax: max 30px offset
        const offset = Math.round(distance * 0.05);
        el.style.setProperty('--parallax-offset', `${offset}px`);
      }
    };

    // Use requestAnimationFrame-throttled scroll listener
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateParallax();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    updateParallax();
  }

  // Mobile dot indicators for magazine panels
  document.querySelectorAll('.magazine-panels').forEach((panel) => {
    const dots = panel.parentElement?.querySelectorAll('.mag-dot');
    if (!dots?.length) return;

    dots[0]?.classList.replace('bg-zinc-300', 'bg-zinc-700');

    panel.addEventListener('scroll', () => {
      const scrollLeft = panel.scrollLeft;
      const panelWidth = panel.clientWidth;
      const activeIndex = Math.round(scrollLeft / panelWidth);

      dots.forEach((dot, i) => {
        if (i === activeIndex) {
          dot.classList.replace('bg-zinc-300', 'bg-zinc-700');
        } else {
          dot.classList.replace('bg-zinc-700', 'bg-zinc-300');
        }
      });
    }, { passive: true });
  });
</script>
```

**Step 2: Run dev server and verify**

Run: `pnpm dev`
Navigate to: `http://localhost:4321/reading/magazine`
Expected:
- Vertical scroll with soft snap between comics
- Subtle parallax movement on desktop (images shift slightly as you scroll)
- Cards stack on top of each other with sticky positioning
- On mobile: horizontal swipe between panels with dot indicators
- With `prefers-reduced-motion`: parallax disabled, snap softened

**Step 3: Commit**

```bash
git add src/pages/reading/magazine.astro
git commit -m "feat(reading): add magazine prototype page with parallax and proximity snap"
```

---

## Task 8: Update reading index hub links and verify all prototypes

**Step 1: Run dev server and test all 3 prototypes**

Run: `pnpm dev`

Test each route:
- `http://localhost:4321/reading/` — hub links to all 3
- `http://localhost:4321/reading/snap` — full-viewport snap
- `http://localhost:4321/reading/slider` — horizontal carousel
- `http://localhost:4321/reading/magazine` — vertical magazine

For each prototype, verify:
1. All 8 comics render with real images
2. VoteButton and ShareActions work
3. Keyboard navigation works (documented keys)
4. Mobile view (DevTools responsive): horizontal panel swiping
5. `prefers-reduced-motion` respected (DevTools > Rendering > Emulate)

**Step 2: Run production build**

Run: `pnpm build`
Expected: Build completes with no errors. All 3 new routes in output.

**Step 3: Commit any fixes from testing**

```bash
git add -u
git commit -m "fix(reading): polish prototype pages after testing"
```

---

## Task 9: Update specs status

**Files:**
- Modify: `specs/README.md`
- Modify: `specs/009-reading-experience/plan.md`

**Step 1: Update spec status to ready**

In `specs/009-reading-experience/plan.md`, change:
```
> Status: **draft**
```
to:
```
> Status: **in-progress**
```

In `specs/README.md`, change the 009 row status from `draft` to `in-progress`.

**Step 2: Commit**

```bash
git add specs/
git commit -m "specs: update 009-reading-experience status to in-progress"
```

---

## Summary of files created

| File | Purpose |
|------|---------|
| `src/pages/reading/index.astro` | Prototype hub with links to all 3 |
| `src/pages/reading/snap.astro` | Full-viewport scroll snap prototype |
| `src/pages/reading/slider.astro` | Horizontal carousel prototype |
| `src/pages/reading/magazine.astro` | Vertical magazine with parallax |
| `src/components/reading/SnapCard.astro` | Snap card component |
| `src/components/reading/SliderCard.astro` | Slider card component |
| `src/components/reading/MagazineCard.astro` | Magazine card component |

Total: 7 new files, 0 existing files modified (except specs status update).
