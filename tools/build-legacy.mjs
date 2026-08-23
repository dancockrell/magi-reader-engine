/**
 * Assemble the single-file reader into an uploadable folder.
 *
 * legacy/index.html is the whole app; it needs the same art and audio
 * the rebuild uses. This puts them together in legacy-dist/ so the
 * release script can zip it exactly like the new one — same checks, same
 * naming, same version.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const out = 'legacy-dist';

if (!existsSync('legacy/index.html')) {
  console.error('legacy/index.html is missing');
  process.exit(1);
}
for (const dir of ['public/art', 'public/magi-audio']) {
  if (!existsSync(dir)) {
    console.error(`${dir} is missing — run: npm run assets`);
    process.exit(1);
  }
}

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

cpSync('legacy/index.html', join(out, 'index.html'));
cpSync('public/art', join(out, 'art'), { recursive: true });
cpSync('public/magi-audio', join(out, 'magi-audio'), { recursive: true });

const count = (dir) =>
  readdirSync(dir).reduce(
    (n, e) => n + (statSync(join(dir, e)).isDirectory() ? count(join(dir, e)) : 1),
    0
  );

console.log(`${out}: ${count(out)} files`);
