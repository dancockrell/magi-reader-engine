/* For every question: is the answer the longest option, and by how much?
 *
 * The book-wide check counts a question as a tell when the answer is the
 * longest option AT ALL, even by one character. A first pass at fixing
 * The Raven lengthened the distractors to within a few characters and
 * moved the score from 82% to 79%, because "within a few characters" is
 * still longest. Closing the gap is not the fix; the answer has to stop
 * being the longest roughly half the time.
 *
 *   node tools/length-tell.mjs <book.json>                                */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node tools/length-tell.mjs <book.json>');
  process.exit(2);
}
const book = JSON.parse(readFileSync(file, 'utf8'));

const rows = [];
for (const [id, t] of Object.entries(book?.teaching || {})) {
  const items = [
    ...(t?.mc || []).map((q, i) => [`q${i + 1}`, q]),
    ...(t?.recap ? [['recap', t.recap]] : []),
  ];
  for (const [tag, q] of items) {
    const lens = (q.opts || []).map((o) => String(o).length);
    if (lens.length < 2) continue;
    const mine = lens[q.correct];
    const best = Math.max(...lens.filter((_, i) => i !== q.correct));
    rows.push({
      where: `${id} ${tag}`,
      mine,
      best,
      margin: mine - best,
      longest: mine >= Math.max(...lens),
    });
  }
}

console.log(`questions: ${rows.length}`);
if (!rows.length) {
  console.error('NO QUESTIONS — nothing measured');
  process.exit(2);
}

const tells = rows.filter((r) => r.longest);
console.log(
  `answer is the longest option in ${tells.length}/${rows.length} ` +
    `(${Math.round((tells.length / rows.length) * 100)}%)\n`
);

for (const r of [...rows].sort((a, b) => b.margin - a.margin)) {
  const flag = r.longest ? 'TELL' : '  ok';
  const need = r.longest ? `  (a distractor needs +${r.margin + 1})` : '';
  console.log(
    `  ${flag}  ${r.where.padEnd(14)} answer ${String(r.mine).padStart(3)}  ` +
      `best other ${String(r.best).padStart(3)}  margin ${String(r.margin).padStart(4)}${need}`
  );
}
