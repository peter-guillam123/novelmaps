// Author-time helper — NOT shipped, not part of playback.
//
// Turns a BBC Sound Effects recording into a small, seamless ambient loop for
// a PlotLines travel mode. The archive files are long 44.1kHz stereo WAV/MP3
// documents with starts, stops and dead air; what the map wants is ten-odd
// seconds of the steady middle that can run under a journey of any length.
//
//   node tools/sfx-loop.mjs <mode> <bbcId> <startSec> <lenSec> [--xf 0.75]
//   e.g. node tools/sfx-loop.mjs foot 07037049 18 12
//
// It fetches the archive MP3, cuts <lenSec> from <startSec>, then folds the
// tail back over the head with an equal-power crossfade so the end runs into
// the beginning without a seam. The published loop is therefore slightly
// shorter than <lenSec> — the crossfade is spent, not added.
//
// Writes BOTH assets/sound/<mode>.ogg and .mp3, mono: Opus-in-Ogg loops
// gaplessly (Chrome/Firefox) because its pre-skip is carried in the container,
// while MP3 has encoder padding baked into the samples. The runtime therefore
// prefers ogg wherever the browser will take it, and keeps mp3 for Safari.
//
// Rhythmic material (footsteps, a pile driver) only loops cleanly if the cut is
// near a whole number of paces/strikes. If a loop limps, nudge <lenSec> by a
// few tenths and listen again — that is the whole tuning process.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'sound');

const [, , mode, id, startArg, lenArg, ...rest] = process.argv;
if (!mode || !id || startArg == null || lenArg == null) {
  console.error('usage: node tools/sfx-loop.mjs <mode> <bbcId> <startSec> <lenSec> [--xf 0.75]');
  process.exit(2);
}
const start = Number(startArg);
const len = Number(lenArg);
const xfIdx = rest.indexOf('--xf');
const XF = xfIdx >= 0 ? Number(rest[xfIdx + 1]) : 0.75;
if (!(len > XF * 2)) {
  console.error(`lenSec (${len}) must be comfortably more than twice the crossfade (${XF})`);
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const tmp = join(outDir, `.${mode}.src.mp3`);

// ---- fetch the archive original ----
const url = `https://sound-effects-media.bbcrewind.co.uk/mp3/${id}.mp3`;
const res = await fetch(url);
if (!res.ok) { console.error(`fetch failed ${res.status} for ${url}`); process.exit(1); }
writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));

// ---- cut, fold the tail over the head, encode ----
// body = [start+XF, start+len-XF]  then  crossfade(tail, head)
// so the loop ends on the material that immediately precedes body's first
// sample: it runs back into itself.
const filter = [
  `[0:a]atrim=start=${start}:duration=${len},asetpts=N/SR/TB,aformat=channel_layouts=mono[seg]`,
  `[seg]asplit=3[s1][s2][s3]`,
  `[s1]atrim=start=${XF}:duration=${len - 2 * XF},asetpts=N/SR/TB[body]`,
  `[s2]atrim=start=${len - XF},asetpts=N/SR/TB[tail]`,
  `[s3]atrim=duration=${XF},asetpts=N/SR/TB[head]`,
  `[tail][head]acrossfade=d=${XF}:c1=tri:c2=tri[seam]`,
  `[body][seam]concat=n=2:v=0:a=1[out]`,
].join(';');

const enc = (file, args) => execFileSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp,
  '-filter_complex', filter, '-map', '[out]', ...args, file,
]);

const ogg = join(outDir, `${mode}.ogg`);
const mp3 = join(outDir, `${mode}.mp3`);
enc(ogg, ['-c:a', 'libopus', '-b:a', '48k', '-application', 'audio']);
enc(mp3, ['-c:a', 'libmp3lame', '-b:a', '64k', '-ar', '44100']);

execFileSync('rm', ['-f', tmp]);
const kb = (f) => Math.round(statSync(f).size / 1024);
console.log(`${mode}: BBC ${id}  cut ${start}s +${len}s, ${XF}s seam  ->  loop ${(len - XF).toFixed(2)}s`);
console.log(`  assets/sound/${mode}.ogg  ${kb(ogg)}KB`);
console.log(`  assets/sound/${mode}.mp3  ${kb(mp3)}KB`);
