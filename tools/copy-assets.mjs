/**
 * Bring the book's media into public/.
 *
 * The pictures and recordings live in the original single-file reader and
 * are not committed here — they are 28 MB of binaries that never change.
 * This copies them in, and says plainly what is missing rather than
 * leaving a reader with silent pages and broken frames.
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const source = process.argv[2] || 'C:/Users/Admin/Downloads/magi-itch-improved (20)';
const dest = resolve(process.cwd(), 'public');

if (!existsSync(source)) {
  console.error(`Cannot find the source reader at:\n  ${source}\n`);
  console.error('Pass its path: npm run assets -- "C:/path/to/magi-itch-improved"');
  process.exit(1);
}

mkdirSync(dest, { recursive: true });

let copied = 0;
for (const dir of ['art', 'magi-audio']) {
  const from = resolve(source, dir);
  if (!existsSync(from)) {
    console.error(`missing in the source: ${dir}`);
    process.exit(1);
  }
  cpSync(from, resolve(dest, dir), { recursive: true });
  const n = readdirSync(resolve(dest, dir)).length;
  copied += n;
  console.log(`${dir.padEnd(12)} ${n} files`);
}

const cues = resolve(dest, 'vtt');
console.log(
  existsSync(cues)
    ? `vtt          ${readdirSync(cues).length} files`
    : 'vtt          none yet — run: npm run book:cues'
);
console.log(`\n${copied} files in place.`);
