// Headless runner of the REAL browser data validator (js/data.js).
//
// Why this exists: rushes.mjs has its own loader and does NOT run the
// js/data.js validator, and the browser load that would is easy to skip
// (or, in a suspended preview tab, impossible). So a book could pass every
// automated gate and still throw on load in the browser — which is exactly
// how Kim shipped with a chapter-numbering gap that broke the live map
// (2026-07-10). This closes that hole: it imports the actual js/data.js
// loadNovel + validate and runs them against every book (or one named file),
// with a tiny fetch shim reading from disk. It is the "it loads" gate,
// checkable from the terminal.
//
//   node tools/validate.mjs               # every book in data/novels.json
//   node tools/validate.mjs data/kim.json # one file

import fs from 'fs';
import { fileURLToPath } from 'url';

// fileURLToPath (not URL.pathname) so the space in "Claude projects" decodes.
const root = fileURLToPath(new URL('..', import.meta.url));

// Shim the browser fetch the loader uses: resolve relative data/ paths
// against the repo root and read them off disk.
global.fetch = async (p) => {
  const path = p.startsWith('http') ? p : root + p;
  return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(path, 'utf8')) };
};

const { loadNovel, loadNovelIndex } = await import('../js/data.js');
const { createTimeline } = await import('../js/timeline.js');
const { buildPaths } = await import('../js/routes.js');

// Nothing may be dated past the end of the clock.
//
// tEnd is built from the data (js/timeline.js) and setT hard-clamps to it, so
// anything later is silently squashed onto the last instant and never really
// happens. It cost us badly on 2026-07-17: thirteen character exits fired
// never, and Romance of the Three Kingdoms had been ending on the wrong year
// since it shipped, its closing beat ("280: the empire made one") playing with
// the clock still reading "234: the death of Zhuge Liang". Both passed every
// gate we had, because valid data is not working data.
//
// timeline.js now folds exits and beats into tEnd, so this check passes by
// construction and will keep passing - which is the point. It is a regression
// guard: the next dated field somebody adds will not be in that calculation,
// and this is what will say so.
function checkNothingPastTheClock(novel, file) {
  const timeline = createTimeline(novel, buildPaths(novel));
  const limit = timeline.tEnd - 0.0001; // where setT clamps
  const late = [];
  for (const c of novel.characters) {
    if (c.exit && c.exit.day > limit) late.push(`"${c.id}" exits on day ${c.exit.day}`);
  }
  for (const [i, b] of (novel.story || []).entries()) {
    if (typeof b.day === 'number' && b.day > limit) {
      late.push(`story beat ${i + 1} ("${b.title || b.kind}") is dated day ${b.day}`);
    }
  }
  if (late.length) {
    throw new Error(`${file}: the clock ends on day ${timeline.tEnd.toFixed(2)}, so these never happen — they are clamped onto the last instant and play as one frame under the wrong chapter:\n    ${late.join('\n    ')}\n  Fold whatever is late into the tEnd calculation in js/timeline.js.`);
  }
}

const arg = process.argv[2];
const books = arg
  ? [{ id: arg.replace(/^.*\//, '').replace(/\.json$/, ''), file: arg }]
  : await loadNovelIndex();

let fails = 0;
for (const b of books) {
  try {
    const novel = await loadNovel(b.file);
    checkNothingPastTheClock(novel, b.file);
    console.log(`  OK   ${b.id}`);
  } catch (e) {
    fails++;
    console.log(`  FAIL ${b.id} :: ${e.message}`);
  }
}
console.log(fails ? `\n${fails} book(s) FAIL the loader — the live map would not load` : `\nall ${books.length} book(s) load clean`);
process.exit(fails ? 1 : 0);
