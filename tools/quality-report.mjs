/**
 * Run the quality gate over real books and say what it finds.
 *
 * `quality.js` has existed for a while with a unit test and no caller. A
 * gate that never runs on real content is the same defect as a check that
 * cannot fail: it looks like coverage and is not. Its own header says the
 * position-bias check "found that 43% of its answers sit in option 0",
 * which means somebody ran it once by hand and nothing has run it since.
 *
 * Advisory by design, so it does not exit non-zero on findings. It DOES
 * exit non-zero when it read no books, because a report over nothing is
 * the failure this whole file exists to avoid.
 *
 *   node tools/quality-report.mjs                 the books in this repo
 *   node tools/quality-report.mjs <path...>       named book.json files
 *   node tools/quality-report.mjs --packs         also any sibling packs
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { qualityOf, positionBias, questionsOf } from '../src/lib/book/quality.js';

const BOOKS = resolve(process.cwd(), 'src/books');

/* Where the split-out packs live, if they are checked out beside this. */
const PACK_ROOTS = [resolve(process.cwd(), '..', '..', '..', 'dev')];

function inRepo() {
  if (!existsSync(BOOKS)) return [];
  return readdirSync(BOOKS)
    .map((d) => join(BOOKS, d, 'book.json'))
    .filter((p) => existsSync(p));
}

function inPacks() {
  const out = [];
  for (const root of PACK_ROOTS) {
    if (!existsSync(root)) continue;
    for (const d of readdirSync(root)) {
      /* pack/book.json is the shipped one; book/book.json is the source.
         Prefer the shipped copy, since that is what a reader loads. */
      for (const rel of ['pack/book.json', 'book/book.json']) {
        const p = join(root, d, ...rel.split('/'));
        if (existsSync(p) && statSync(p).isFile()) {
          out.push(p);
          break;
        }
      }
    }
  }
  return out;
}

const args = process.argv.slice(2);
const named = args.filter((a) => !a.startsWith('--'));
const wantPacks = args.includes('--packs');

let files = named.length ? named.map((p) => resolve(p)) : inRepo();
if (wantPacks || !named.length) files = [...new Set([...files, ...inPacks()])];

/* The population, said out loud before anything is concluded from it. */
console.log(`books found: ${files.length}`);
for (const f of files) console.log(`  ${f}`);
console.log();

if (!files.length) {
  console.error('NO BOOKS FOUND — this report means nothing');
  process.exit(2);
}

/* The book says what it is called; the path only hints. Running the
   report on a file in a scratch directory labelled it with a session
   UUID, which is the directory's name and not the book's. */
const label = (f, book) => {
  const id = book?.meta?.id || book?.id;
  if (id) return String(id);
  const parts = f.split(sep);
  const i = parts.lastIndexOf('books');
  if (i >= 0 && parts[i + 1]) return parts[i + 1];
  /* a pack: name it after the repo directory, not "pack" */
  return parts[parts.length - 3] || f;
};

const rows = [];

for (const f of files) {
  let book;
  try {
    book = JSON.parse(readFileSync(f, 'utf8'));
  } catch (e) {
    const fallback = label(f, null);
    console.log(`### ${fallback}`);
    console.log(`  UNREADABLE: ${e.message}\n`);
    rows.push({ name: fallback, score: 0, high: 0, low: 0, questions: 0, note: 'unreadable' });
    continue;
  }
  const name = label(f, book);

  const { score, findings, counts } = qualityOf(book);
  const bias = positionBias(questionsOf(book));
  const high = findings.filter((x) => x.severity === 'high').length;

  rows.push({
    name,
    score,
    high,
    low: findings.length - high,
    questions: counts.questions,
  });

  console.log(`### ${name}`);
  console.log(`  ${counts.questions} question(s), ${counts.glosses} gloss(es), score ${score}`);
  if (bias) {
    console.log(
      `  answers land on option ${bias.slot} in ${Math.round(bias.share * 100)}% ` +
        `of questions (even spread would be ${Math.round(bias.even * 100)}%)`
    );
  }

  if (!findings.length) {
    console.log('  nothing flagged.\n');
    continue;
  }

  const byKind = new Map();
  for (const x of findings) {
    if (!byKind.has(x.kind)) byKind.set(x.kind, []);
    byKind.get(x.kind).push(x);
  }

  for (const [kind, list] of [...byKind].sort((a, b) => b[1].length - a[1].length)) {
    const sev = list[0].severity === 'high' ? 'HIGH' : 'low ';
    console.log(`  [${sev}] ${kind} (${list.length})`);
    for (const x of list.slice(0, 6)) console.log(`         ${x.where}: ${x.what}`);
    if (list.length > 6) console.log(`         ... and ${list.length - 6} more`);
    console.log(`         why: ${list[0].why}`);
  }
  console.log();
}

console.log('worst first:');
for (const r of [...rows].sort((a, b) => a.score - b.score)) {
  console.log(
    `  ${String(r.score).padStart(3)}  ${r.name.padEnd(38)} ` +
      `${r.high} high, ${r.low} low, over ${r.questions} question(s)` +
      (r.note ? `  (${r.note})` : '')
  );
}
