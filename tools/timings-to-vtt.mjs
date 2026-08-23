/**
 * Convert the private timings format into WebVTT files.
 *
 * Run once against the old reader's `timings.js`. After this the timing
 * data is a standard every captioning tool understands, and the next
 * book's version can come straight out of Whisper instead of a bespoke
 * Python script.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { toVtt, wordsFromVtt } from '../src/lib/media/vtt.js';

const src =
  process.argv[2] || 'C:/Users/Admin/Downloads/magi-itch-improved (20)/magi-audio/timings.js';
const outDir = process.argv[3] || resolve(process.cwd(), 'public/magi-audio/vtt');

const text = readFileSync(src, 'utf8');

/* The file assigns onto `window`; give it one and take the value back. */
const win = {};
Function('window', text)(win);
const timings = win.RAVEN_TIMINGS;
if (!timings) throw new Error('no RAVEN_TIMINGS in ' + src);

mkdirSync(outDir, { recursive: true });

let written = 0;
let words = 0;
let empty = 0;
const broken = [];

for (const [id, list] of Object.entries(timings)) {
  const vtt = toVtt(list, { id });
  if (!vtt.includes('-->')) {
    empty += 1;
    continue;
  }

  /* Every file is read back before it is trusted. A conversion that
     silently drops a word would be invisible until a class watched the
     highlight skip. */
  const back = wordsFromVtt(vtt);
  if (back.length !== list.length) {
    broken.push(`${id}: ${list.length} words in, ${back.length} out`);
    continue;
  }
  for (let i = 0; i < list.length; i++) {
    if (back[i].w !== list[i].w || back[i].t !== list[i].t) {
      broken.push(
        `${id}: word ${i} changed — "${list[i].w}"@${list[i].t} → "${back[i].w}"@${back[i].t}`
      );
      break;
    }
  }

  writeFileSync(resolve(outDir, `${id}.vtt`), vtt, 'utf8');
  written += 1;
  words += list.length;
}

console.log(`clips in timings.js: ${Object.keys(timings).length}`);
console.log(`vtt files written:   ${written}`);
console.log(`words carried over:  ${words}`);
console.log(`empty clips skipped: ${empty}`);
console.log(`round-trip failures: ${broken.length}`);
for (const b of broken.slice(0, 10)) console.log(`   ${b}`);
if (broken.length) process.exit(1);
