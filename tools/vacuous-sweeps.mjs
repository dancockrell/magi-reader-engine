/**
 * Which checks would report success without running?
 *
 * The shape, named by three sessions hitting it on the same day in three
 * different tools: a check that cannot execute reports the same thing as
 * a check that passed.
 *
 * Here it looks like this. A test walks a population, collects whatever
 * is wrong, and asserts the list is empty. That passes when nothing is
 * wrong AND when nothing was examined, and the two are indistinguishable
 * from outside. This project has already been bitten twice:
 *
 *   `extracted.test.js` asserted inPackage + written + recaps === inSource
 *   where the recap term was always zero, because recaps were being
 *   written to a key nothing read. A term that is always zero is not a
 *   check, and four act reviews shipped unasked for a whole release.
 *
 *   A media probe stripped ".mp3" with a regex that never matched, so
 *   every clip looked missing when none were.
 *
 * A sweep is fine if something proves the population was not empty.
 * `engine.test.js` does it properly with a sibling test: "has source
 * files to check, so this test cannot pass by finding none". That is the
 * pattern to copy, and this tool cannot see it, so anything guarded by a
 * neighbouring test shows up here as a false positive.
 *
 * Report only. Not a test, because the honest count today is thirty-odd
 * and most are deliberate assertions about a fixed input. Run it when
 * adding a sweep, and read the list rather than trusting the number.
 *
 *   node tools/vacuous-sweeps.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOTS = [resolve(process.cwd(), 'src'), resolve(process.cwd(), 'e2e')];

function testFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) testFiles(p, out);
    else if (/\.(test|spec)\.[jt]sx?$/.test(name)) out.push(p);
  }
  return out;
}

const files = ROOTS.flatMap((r) => testFiles(r));

/* This tool's own first version reported "0 sweeps, 0 unguarded" having
   found no files at all, which is the very thing it exists to catch. It
   says its population out loud now, and fails rather than reporting a
   clean sweep of nothing. */
console.log(`test files examined: ${files.length}`);
if (!files.length) {
  console.error('NO TEST FILES FOUND — this report means nothing');
  process.exit(1);
}

const EMPTY = /\.toEqual\(\s*\[\s*\]\s*\)|\.toHaveLength\(\s*0\s*\)/;
const WALKS = /\bfor\s*\(\s*const\b|\.filter\(|\.flatMap\(|\.forEach\(/;
const GUARD =
  /toBeGreaterThan|not\.toHaveLength\(\s*0\s*\)|not\.toEqual\(\s*\[\s*\]\s*\)|toHaveLength\(\s*[1-9]/;

let sweeps = 0;
const bare = [];

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  const starts = [];
  lines.forEach((l, i) => {
    if (/^\s*(it|test)(\.\w+)?\s*\(/.test(l)) starts.push(i);
  });
  for (let s = 0; s < starts.length; s++) {
    const from = starts[s];
    const to = s + 1 < starts.length ? starts[s + 1] : lines.length;
    const body = lines.slice(from, to).join('\n');
    if (!EMPTY.test(body) || !WALKS.test(body)) continue;
    sweeps++;
    if (GUARD.test(body)) continue;
    const name = body.match(/['"`]([^'"`]{4,80})/)?.[1] ?? '(unnamed)';
    bare.push(`${f.split(/[\\/]/).slice(-2).join('/')}:${from + 1}  ${name}`);
  }
}

console.log(`sweeps over a population    : ${sweeps}`);
console.log(`without a population check  : ${bare.length}\n`);
for (const b of bare) console.log('  ' + b);
console.log(
  '\nRead the list. A test that asserts emptiness about a fixed input is' +
    '\nfine; one that walks a book and would pass on an empty book is not.'
);
