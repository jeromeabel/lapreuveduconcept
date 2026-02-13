#!/usr/bin/env node

/**
 * New Comic Creator
 *
 * Creates all files for a new comic post:
 * - Copies source PNGs from the export folder
 * - Creates the content markdown file with frontmatter
 * - Generates the cover image
 * - Optimizes all images
 *
 * Usage:
 *   pnpm new-comic 005
 */

import { mkdir, copyFile, writeFile, readdir } from "fs/promises";
import { join } from "path";
import { createInterface } from "readline";
import { execSync } from "child_process";

const EXPORT_DIR = "/home/jabel/Documents/projects/dessin-leconceptdelapreuve/export";
const COMICS_ASSETS = "src/assets/comics";
const COMICS_CONTENT = "src/content/comics";
const IMG_PREFIX = "jeromeabel-creativecommons-by-nc-leconceptdelapreuve";

// ─── CLI ─────────────────────────────────────────

const comicId = process.argv[2];

if (!comicId) {
  console.error("Usage: pnpm new-comic <comic-id>");
  console.error("Example: pnpm new-comic 005");
  process.exit(1);
}

const ALT_PREFIX =
  "Dessin d'un homme, une femme et un enfant dans l'entrée d'une maison. Une bulle de texte indique : '";

// ─── Helpers ─────────────────────────────────────

function ask(question, prefill = "") {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  if (prefill) rl.write(prefill);
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function titleCase(slug) {
  return slug
    .split("-")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function findSourceFolder(id) {
  const entries = await readdir(EXPORT_DIR);
  const folder = entries.find((e) => e.startsWith(`${id}-`));

  if (!folder) {
    console.error(`\n❌ No folder matching ${id}-* in:\n   ${EXPORT_DIR}`);
    console.error(`   Found: ${entries.filter((e) => e.startsWith(id)).join(", ") || "(none)"}`);
    process.exit(1);
  }

  const slug = folder.slice(id.length + 1); // "004-miaou" → "miaou"
  const folderPath = join(EXPORT_DIR, folder);
  const files = await readdir(folderPath);

  // Match various naming patterns: page-1.png, p1.png, 1.png
  const p1 = files.find((f) => /^(page-)?[p]?1\.png$/.test(f));
  const p2 = files.find((f) => /^(page-)?[p]?2\.png$/.test(f));

  if (!p1 || !p2) {
    console.error(`\n❌ Could not find page 1 & 2 images in: ${folderPath}`);
    console.error(`   Found: ${files.join(", ")}`);
    process.exit(1);
  }

  return {
    src1: join(folderPath, p1),
    src2: join(folderPath, p2),
    slug,
  };
}

// ─── Main ────────────────────────────────────────

async function main() {
  console.log(`\n📖 Creating new comic: ${comicId}\n`);

  // 1. Find source folder and images
  const { src1, src2, slug } = await findSourceFolder(comicId);
  const guessedTitle = titleCase(slug);
  console.log(`  Found: ${src1}`);
  console.log(`  Found: ${src2}`);

  // 2. Confirm title and complete alt text
  const title = await ask(`\n  Title [${guessedTitle}]: `) || guessedTitle;
  console.log(`  ${ALT_PREFIX}...`);
  const altEnding = await ask("  Finish the sentence: '");
  const alt = `${ALT_PREFIX}${altEnding}`;

  if (!title.trim()) {
    console.error("\n❌ Title cannot be empty");
    process.exit(1);
  }

  // 3. Create asset directory
  const assetDir = join(COMICS_ASSETS, comicId);
  await mkdir(assetDir, { recursive: true });
  console.log(`\n  Created: ${assetDir}`);

  // 4. Copy source images to comic folder (optimize will back up to original/)
  const p1Name = `${IMG_PREFIX}-${comicId}-p1.png`;
  const p2Name = `${IMG_PREFIX}-${comicId}-p2.png`;

  await copyFile(src1, join(assetDir, p1Name));
  await copyFile(src2, join(assetDir, p2Name));
  console.log(`  Copied:  ${p1Name}`);
  console.log(`  Copied:  ${p2Name}`);

  // 5. Create content markdown file
  const today = new Date().toISOString().split("T")[0];
  const coverPath = `../../assets/comics/${comicId}/${IMG_PREFIX}-${comicId}-cover.png`;
  const page1Path = `../../assets/comics/${comicId}/${IMG_PREFIX}-${comicId}-p1.png`;
  const page2Path = `../../assets/comics/${comicId}/${IMG_PREFIX}-${comicId}-p2.png`;

  const markdown = `---
title: "${title}"
date: ${today}
cover: ${coverPath}
pages:
  - ${page1Path}
  - ${page2Path}
alt: "${alt}"
---
`;

  const mdPath = join(COMICS_CONTENT, `${comicId}.md`);
  await writeFile(mdPath, markdown, "utf-8");
  console.log(`  Created: ${mdPath}`);

  // 6. Generate cover (reads full-resolution page images)
  console.log(`\n  Running: pnpm cover ${comicId}`);
  execSync(`pnpm cover ${comicId}`, { stdio: "inherit" });

  // 7. Optimize images (backs up to original/, then compresses in place)
  console.log(`  Running: pnpm optimize ${comicId}`);
  execSync(`pnpm optimize ${comicId}`, { stdio: "inherit" });

  console.log(`\n✅ Comic ${comicId} is ready!\n`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
