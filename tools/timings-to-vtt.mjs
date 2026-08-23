/**
 * Convert the private timing format into one WebVTT file.
 *
 * Run once against the old reader's `timings.js`. After this the timing
 * data is a standard every captioning tool understands, and the next
 * book's version can come straight out of Whisper instead of a bespoke
 * Python script.
 *
 * One file, not 519. itch rejects a zip of more than 1000 files, and a
 * .vtt per clip put the build at 1266 — the upload failed outright. A
 * WebVTT file carries any number of identified cues, so this costs
 * nothing in fidelity and saves 518 files and 518 requests.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { toVttBundle, wordsByClip } from '../src/lib/media/vtt.js';

const src =
  process.argv[2] || 'C:/Users/Admin/Downloads/magi-itch-improved (20)/magi-audio/timings.js';
const out = process.argv[3] || resolve(process.cwd(), 'public/cues/magi.vtt');

const text = readFileSync(src, 'utf8');

/* The file assigns onto `window`; give it one and take the value back. */
const win = {};
Function('window', text)(win);
const timings = win.RAVEN_TIMINGS;
if (!timings) throw new Error('no RAVEN_TIMINGS in ' + src);

const bundle = toVttBundle(timings);

/* Read it back before trusting it. A conversion that silently drops a
   word would be invisible until a class watched the highlight skip. */
const back = wordsByClip(bundle);
const broken = [];
let words = 0;

for (const [id, list] of Object.entries(timings)) {
  const got = back[id];
  if (!got) {
    broken.push(`${id}: missing from the bundle`);
    continue;
  }
  if (got.length !== list.length) {
    broken.push(`${id}: ${list.length} words in, ${got.length} out`);
    continue;
  }
  for (let i = 0; i < list.length; i++) {
    if (got[i].w !== list[i].w || got[i].t !== list[i].t) {
      broken.push(`${id}: word ${i} changed — "${list[i].w}"@${list[i].t}`);
      break;
    }
  }
  words += list.length;
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, bundle, 'utf8');

console.log(`clips in timings.js: ${Object.keys(timings).length}`);
console.log(`cues in the bundle:  ${Object.keys(back).length}`);
console.log(`words carried over:  ${words}`);
console.log(`round-trip failures: ${broken.length}`);
console.log(`size:                ${(bundle.length / 1024).toFixed(1)} KB`);
console.log(`written:             ${out}`);
for (const b of broken.slice(0, 10)) console.log(`   ${b}`);
if (broken.length) process.exit(1);
