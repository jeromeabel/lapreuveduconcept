#!/usr/bin/env node

/**
 * Cover Image Generator
 *
 * Composites comic page images into a cover image with title and credits.
 *
 * Usage:
 *   pnpm generate-cover 001
 */

import { readFile, stat } from "fs/promises";
import { join, dirname } from "path";
import sharp from "sharp";

const COMICS_CONTENT = "src/content/comics";
const COMICS_ASSETS = "src/assets/comics";

// Layout constants (px) — OG image best practice: 1200×630
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 630;
const MARGIN = 40;
const GAP = 20;
const BORDER_WIDTH = 1;
const BORDER_COLOR = "#333333";
const BG_COLOR = "#ffffff";

const ROW_GAP = 12;

// Typography
const SERIES_FONT_SIZE = 20;
const EPISODE_FONT_SIZE = 24;
const CREDITS_FONT_SIZE = 14;
const CREDITS_COLOR = "#888888";
const FONT_FAMILY = "Inconsolata";

// Layout
const TEXT_COLUMN_WIDTH = 340;
const TEXT_LINE_GAP = 10;
const TEXT_COLUMN_GAP = 40;
const TEXT_COLUMN_TOP_MARGIN = 40;
const DIVIDER_COLOR = "#b5b5b5";
const DIVIDER_HEIGHT = 1;
const DIVIDER_MARGIN = 22;


// ─── CLI ─────────────────────────────────────────

const comicId = process.argv[2];

if (!comicId) {
  console.error("Usage: pnpm generate-cover <comic-id>");
  console.error("Example: pnpm generate-cover 001");
  process.exit(1);
}

// ─── Frontmatter parsing ─────────────────────────

async function readFrontmatter(id) {
  const mdPath = join(COMICS_CONTENT, `${id}.md`);
  let content;
  try {
    content = await readFile(mdPath, "utf-8");
  } catch {
    console.error(`❌ Comic not found: ${mdPath}`);
    process.exit(1);
  }

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    console.error(`❌ No frontmatter found in ${mdPath}`);
    process.exit(1);
  }

  const fm = fmMatch[1];

  const title = fm.match(/^title:\s*"(.+)"/m)?.[1];
  const date = fm.match(/^date:\s*(\S+)/m)?.[1];
  const pages = [...fm.matchAll(/^\s+-\s+(.+)/gm)].map((m) => m[1]);

  if (!title || !date || pages.length === 0) {
    console.error(`❌ Missing title, date, or pages in frontmatter`);
    process.exit(1);
  }

  // Resolve page paths relative to the markdown file
  const mdDir = dirname(mdPath);
  const resolvedPages = pages.map((p) => join(mdDir, p));

  return { title, date, pages: resolvedPages };
}

// ─── SVG text helpers ────────────────────────────

function textBlockSvg(width, height, lines, dividerY) {
  const textElements = lines
    .map(({ text, y, size, weight, fill }) => {
      const escaped = escapeXml(text);
      return `<text
        x="0" y="${y}"
        dominant-baseline="hanging"
        font-family="${FONT_FAMILY}"
        font-weight="${weight || 400}"
        font-size="${size}px"
        fill="${fill || '#000000'}"
      >${escaped}</text>`;
    })
    .join("\n");

  const divider =
    typeof dividerY === "number"
      ? `<rect x="0" y="${dividerY}" width="${width}" height="${DIVIDER_HEIGHT}" fill="${DIVIDER_COLOR}" />`
      : "";

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${divider}
      ${textElements}
    </svg>
  `);
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Border SVG helper ───────────────────────────

function borderSvg(w, h) {
  return Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="${BORDER_WIDTH / 2}" y="${BORDER_WIDTH / 2}"
        width="${w - BORDER_WIDTH}" height="${h - BORDER_WIDTH}"
        fill="none" stroke="${BORDER_COLOR}" stroke-width="${BORDER_WIDTH}"
      />
    </svg>
  `);
}

// ─── Main ────────────────────────────────────────

async function main() {
  console.log(`\nGenerating cover for comic ${comicId}...\n`);

  // 1. Read frontmatter
  const { title, date, pages } = await readFrontmatter(comicId);
  console.log(`  Title: "${title}"`);
  console.log(`  Date:  ${date}`);
  console.log(`  Pages: ${pages.length}`);

  // 2. Load page images and get dimensions
  const pageImages = [];
  for (const pagePath of pages) {
    try {
      await stat(pagePath);
    } catch {
      console.error(`\n❌ Page image not found: ${pagePath}`);
      process.exit(1);
    }
    const meta = await sharp(pagePath).metadata();
    pageImages.push({ path: pagePath, width: meta.width, height: meta.height });
  }

  // 3. Prepare text block and sizing
  const textColumnWidth = TEXT_COLUMN_WIDTH;
  const imagesAreaWidth = OUTPUT_WIDTH - MARGIN * 2 - textColumnWidth - TEXT_COLUMN_GAP;
  const imagesAreaHeight = OUTPUT_HEIGHT - MARGIN * 2;
  const imagesRowTop = MARGIN;

  // 4. Calculate image row layout
  const pageCount = pageImages.length;
  const pagesAreaLeft = MARGIN;
  const pagesAreaWidth = imagesAreaWidth;
  const pageSlotWidth = Math.floor(
    (pagesAreaWidth - GAP * (pageCount - 1)) / pageCount
  );

  // Scale pages to fit image row height
  const maxPageHeight = imagesAreaHeight;
  const scaledPages = pageImages.map((img) => {
    const scaleW = pageSlotWidth / img.width;
    const scaleH = maxPageHeight / img.height;
    const scale = Math.min(scaleW, scaleH);
    return {
      ...img,
      scaledWidth: Math.round(img.width * scale),
      scaledHeight: Math.round(img.height * scale),
    };
  });

  const tallestPage = Math.max(...scaledPages.map((p) => p.scaledHeight));

  console.log(`\n  Layout: ${OUTPUT_WIDTH}×${OUTPUT_HEIGHT}px`);
  console.log(`  Rows: images, title, info`);
  console.log(`  Page slot: ${pageSlotWidth}px wide, tallest: ${tallestPage}px`);

  // 5. Build composites
  const composites = [];

  // Top row: page images, vertically centered
  const pagesTop = imagesRowTop + Math.round((imagesAreaHeight - tallestPage) / 2);
  const pagesRowWidth =
    scaledPages.reduce((sum, page) => sum + page.scaledWidth, 0) +
    GAP * (pageCount - 1);
  let x = pagesAreaLeft + Math.round((pagesAreaWidth - pagesRowWidth) / 2);

  for (const page of scaledPages) {
    const resizedBuf = await sharp(page.path)
      .resize(page.scaledWidth, page.scaledHeight)
      .toBuffer();

    // Border
    composites.push({
      input: borderSvg(
        page.scaledWidth + BORDER_WIDTH * 2,
        page.scaledHeight + BORDER_WIDTH * 2
      ),
      top: pagesTop - BORDER_WIDTH,
      left: x - BORDER_WIDTH,
    });

    // Page image
    composites.push({
      input: resizedBuf,
      top: pagesTop,
      left: x,
    });

    x += page.scaledWidth + GAP;
  }

  // Right column: stacked text
  const seriesLine = "Le concept de la preuve";
  const slugLine = `#${comicId}`;
  const licenceLine = "Creative Commons CC0";

  let textY = 0;
  const textLines = [];
  textLines.push({ text: seriesLine, y: textY, size: SERIES_FONT_SIZE, weight: 400 });
  textY += SERIES_FONT_SIZE + TEXT_LINE_GAP;
  textLines.push({ text: slugLine, y: textY, size: EPISODE_FONT_SIZE, weight: 500 });
  textY += EPISODE_FONT_SIZE + DIVIDER_MARGIN;
  const dividerY = textY;
  textY += DIVIDER_HEIGHT + DIVIDER_MARGIN;
  textLines.push({ text: "Jérôme Abel", y: textY, size: CREDITS_FONT_SIZE, weight: 400, fill: CREDITS_COLOR });
  textY += CREDITS_FONT_SIZE + TEXT_LINE_GAP;
  textLines.push({ text: licenceLine, y: textY, size: CREDITS_FONT_SIZE, weight: 400, fill: CREDITS_COLOR });
  textY += CREDITS_FONT_SIZE + TEXT_LINE_GAP;
  textLines.push({ text: date, y: textY, size: CREDITS_FONT_SIZE, weight: 400, fill: CREDITS_COLOR });
  textY += CREDITS_FONT_SIZE;

  const textBlockHeight = Math.min(textY, imagesAreaHeight);
  const textBlockTop = pagesTop + TEXT_COLUMN_TOP_MARGIN;
  const textBlockLeft = MARGIN + imagesAreaWidth + TEXT_COLUMN_GAP;

  composites.push({
    input: textBlockSvg(textColumnWidth, textBlockHeight, textLines, dividerY),
    top: textBlockTop,
    left: textBlockLeft,
  });

  // 5. Compose final image
  const outputPath = join(
    COMICS_ASSETS,
    comicId,
    `jeromeabel-creativecommons-by-nc-leconceptdelapreuve-${comicId}-cover.png`
  );

  await sharp({
    create: {
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      channels: 3,
      background: BG_COLOR,
    },
  })
    .composite(composites)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "cover", position: "center" })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`\n✅ Cover written to: ${outputPath}\n`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
