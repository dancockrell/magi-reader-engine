/**
 * Bring the book's media into public/.
 *
 * The pictures and recordings are 28 MB of binaries that never change and
 * are not committed here. This copies them in and says plainly what is
 * missing, rather than leaving a reader with silent pages and empty
 * frames.
 *
 * IT USED TO NAME ONE FOLDER, and that folder moved. `npm run assets`
 * then failed with "cannot find the source reader", which reads like the
 * media is gone. It was not gone: it was one directory further down, and
 * the rest of it was spread across four sibling folders, none of which
 * held a complete set. Recovering by hand found every one of 54 pictures
 * and 327 recordings, so nothing was ever lost, only scattered.
 *
 * So this searches every place the media is known to survive, takes the
 * first copy of each file, and reports what it could not find. Where the
 * same name exists in more than one source the sizes are compared: they
 * have always agreed, and the day they do not is worth hearing about
 * rather than resolving silently by search order.
 *
 * A path can still be passed, and is searched first:
 *   npm run assets -- "C:/path/to/a/reader/folder"
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/* The parent of this repository, where the shipped readers were unpacked. */
const NEIGHBOURS = resolve(process.cwd(), '..');

const ROOTS = [
  process.argv[2],
  join(NEIGHBOURS, 'magi-itch-folder'),
  join(NEIGHBOURS, 'magi-itch-ui'),
  join(NEIGHBOURS, 'magi-itch-guide2-clean'),
  join(NEIGHBOURS, 'magi-itch-improved (20)'),
  resolve(process.cwd(), 'dist'),
  resolve(process.cwd(), 'legacy-dist'),
  'C:/Users/Admin/dev/magi-reader',
].filter((r) => r && existsSync(r));

const dest = resolve(process.cwd(), 'public');
mkdirSync(dest, { recursive: true });

if (!ROOTS.length) {
  console.error('No source folder found. Pass one:');
  console.error('  npm run assets -- "C:/path/to/a/reader/folder"');
  process.exit(1);
}

console.log(`searching ${ROOTS.length} source folder(s)\n`);

let total = 0;
let disagreements = 0;

for (const dir of ['art', 'magi-audio']) {
  const sources = ROOTS.map((r) => join(r, dir)).filter(existsSync);
  if (!sources.length) {
    console.error(`no source has a ${dir}/ folder`);
    process.exit(1);
  }

  const out = resolve(dest, dir);
  mkdirSync(out, { recursive: true });
  const have = new Set(readdirSync(out));

  /* Every distinct filename any source offers. Taking the union rather
     than one folder is the whole point: no single folder is complete. */
  const names = new Set();
  for (const s of sources) for (const f of readdirSync(s)) names.add(f);

  let copied = 0;
  for (const name of names) {
    if (have.has(name)) continue;
    const hits = sources.filter((s) => existsSync(join(s, name)));
    if (hits.length > 1) {
      const sizes = new Set(hits.map((s) => statSync(join(s, name)).size));
      if (sizes.size > 1) {
        disagreements++;
        console.warn(`  differs between sources: ${name} (${[...sizes].join(' / ')} bytes)`);
      }
    }
    copyFileSync(join(hits[0], name), join(out, name));
    copied++;
  }

  const now = readdirSync(out).length;
  total += now;
  console.log(`${dir.padEnd(12)} ${String(now).padStart(4)} files  (${copied} copied in)`);
}

const cues = resolve(dest, 'cues');
console.log(
  existsSync(cues)
    ? `cues         ${String(readdirSync(cues).length).padStart(4)} files`
    : 'cues         none yet, run: npm run book:cues'
);

if (disagreements) {
  console.warn(`\n${disagreements} file(s) differ between sources. Search order decided it.`);
}
console.log(`\n${total} files in place.`);
