#!/usr/bin/env node
// Build the atlas index: one lightweight file of every place-pin across the
// whole shelf, so the atlas view loads a single ~100KB file instead of all
// 21 books. Re-run when a book is added or its places change:
//   node tools/build-atlas.mjs
// Each pin carries only what the atlas needs — its coordinates, its names,
// which book it belongs to (and that book's spine colour, for the dot), its
// certainty, and its image metadata (the file loads lazily, on click, only
// when a reader opens the card — never eagerly; 64MB of pictures at once
// would be a memory bomb).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const index = JSON.parse(readFileSync(root + 'data/novels.json', 'utf8'));
const shelf = Array.isArray(index) ? index : index.books || index.novels;

const books = [];
const pins = [];

for (const entry of shelf) {
  const file = entry.file || `data/${entry.id}.json`;
  let novel;
  try {
    novel = JSON.parse(readFileSync(root + file, 'utf8'));
  } catch {
    console.warn(`  skip ${entry.id}: ${file} not readable`);
    continue;
  }
  const cloth = entry.spine?.cloth || '#5a4632';
  const text = entry.spine?.text || '#f3ead7';
  books.push({
    id: entry.id, title: entry.title, author: entry.author,
    year: entry.year, cloth, text,
  });

  for (const loc of novel.locations || []) {
    if (!Array.isArray(loc.coords)) continue;
    pins.push({
      book: entry.id,
      id: loc.id,                              // the place's id within its book
      cloth,                                   // the dot colour (book's spine)
      name: loc.novelName || loc.name,         // how the book names it (the title)
      realName: loc.name,                      // the modern/real name
      coords: loc.coords,
      certainty: loc.certainty,
      story: loc.story || '',
      hasImage: !!loc.image,
      image: loc.image
        ? { file: loc.image.file, caption: loc.image.caption,
            credit: loc.image.credit, indicative: !!loc.image.indicative }
        : null,
    });
  }
}

const out = { count: pins.length, books, pins };
writeFileSync(root + 'data/atlas.json', JSON.stringify(out) + '\n');
console.log(`atlas: ${pins.length} pins across ${books.length} books → data/atlas.json`);
