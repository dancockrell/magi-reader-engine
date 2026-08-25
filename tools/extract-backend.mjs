/**
 * Lift the Apps Script backend out of the prototype.
 *
 * It has been sitting in `legacy/index.html` as a `<script
 * type="text/plain">` block for teachers to copy out by hand — which
 * means the React build shipped a Class panel asking for a deployment
 * link that a teacher had no way to create from it.
 *
 * Unlike the book, this is not a pack: it is the engine's own backend,
 * the same for every title. So it lands in `src/backend/` as source, is
 * committed, and is served to the teacher from the app itself.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const from = resolve(process.argv[2] || 'legacy/index.html');
const to = resolve(process.argv[3] || 'src/backend/backend.gs');

const src = readFileSync(from, 'utf8');

const open = /<script[^>]*id="ravenBackend"[^>]*>/.exec(src);
if (!open) throw new Error('no <script id="ravenBackend"> in ' + from);

const start = open.index + open[0].length;
const end = src.indexOf('</script>', start);
if (end < 0) throw new Error('the backend block is never closed');

let code =
  src
    .slice(start, end)
    .replace(/^\r?\n/, '')
    .replace(/\s+$/, '') + '\n';

/**
 * One deliberate edit, and it is a rename.
 *
 * The engine is Magi Reader; "Raven classroom" was a working name and
 * is being retired everywhere, including in the thing a teacher pastes
 * into their own Sheet and then reads the comments of.
 */
const RENAMED = code.replace(/Raven classroom backend/g, 'Magi Reader — classroom backend');
const renames = code === RENAMED ? 0 : 1;
code = RENAMED;

/* It has to be JavaScript. A backend that does not parse is a teacher
   pasting three hundred lines into their Sheet and getting a syntax
   error with no idea which part came out wrong. */
new Function(code);

for (const route of ['function doPost', 'function doGet']) {
  if (!code.includes(route)) throw new Error(`the backend has no ${route}`);
}

mkdirSync(dirname(to), { recursive: true });
writeFileSync(to, code, 'utf8');

const lines = code.split('\n').length;
console.log(`backend: ${lines} lines, ${(code.length / 1024).toFixed(1)} KB`);
console.log(`renamed: ${renames}`);
console.log(`written: ${to}`);
