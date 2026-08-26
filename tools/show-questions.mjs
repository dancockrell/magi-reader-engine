/* Print named questions with their options and lengths, so a length tell
   can be seen rather than inferred from a percentage.

     node tools/show-questions.mjs <book.json> [unit ...]           */
import { readFileSync } from 'node:fs';

const [file, ...want] = process.argv.slice(2);
if (!file) {
  console.error('usage: node tools/show-questions.mjs <book.json> [unit ...]');
  process.exit(2);
}

const book = JSON.parse(readFileSync(file, 'utf8'));
let shown = 0;

for (const [id, t] of Object.entries(book?.teaching || {})) {
  if (want.length && !want.includes(id)) continue;
  const items = [
    ...(t?.mc || []).map((q, i) => [`q${i + 1}`, q]),
    ...(t?.recap ? [['act review', t.recap]] : []),
  ];
  for (const [tag, q] of items) {
    const lens = (q.opts || []).map((o) => String(o).length);
    const max = Math.max(...lens, 0);
    const others = lens.filter((_, i) => i !== q.correct);
    const margin = lens[q.correct] - Math.max(...others, 0);
    if (want.length === 0 && margin < 10) continue;
    shown++;
    console.log(`\n${id} ${tag}   margin +${margin}`);
    console.log(`  Q: ${q.q}`);
    (q.opts || []).forEach((o, i) => {
      const mark = i === q.correct ? '=>' : '  ';
      const bar = lens[i] === max ? ' <- longest' : '';
      console.log(`  ${mark} [${i}] (${String(lens[i]).padStart(3)}) ${o}${bar}`);
    });
  }
}

console.log(`\nquestions shown: ${shown}`);
if (!shown) {
  console.error('NONE MATCHED — check the unit ids, this is not a clean result');
  process.exit(1);
}
