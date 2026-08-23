/**
 * Recover the shipping app's history from the archives.
 *
 * Two days of work exist only as 66 hand-named zips in a folder. That is
 * a real history — 49 distinct versions of index.html — with no way to
 * diff two of them, no way to see when a behaviour changed, and no way
 * to bisect when something breaks. Which is exactly the position we are
 * in now: there is no build anyone has confirmed working, so a
 * regression has nothing to be measured against.
 *
 * This reads index.html out of each archive, drops duplicates, orders
 * what is left by the archive's own timestamp, and commits each as one
 * revision on an orphan branch. After it runs:
 *
 *     git log --oneline legacy-history
 *     git diff <a> <b> -- legacy/index.html
 *     git bisect start legacy-history~0 legacy-history~30
 *
 * The branch is deliberately unattached to master. These are recovered
 * artifacts, not authored commits, and pretending otherwise would put
 * invented parentage into the history.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, statSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { openSync, readSync, closeSync } from 'node:fs';
import AdmZipless from 'node:zlib';

/* Read one entry out of a zip without a dependency: find its local
   header, then inflate. Only "stored" and "deflate" appear here. */
function readEntry(zipPath, wanted) {
  const fd = openSync(zipPath, 'r');
  try {
    const size = statSync(zipPath).size;
    const tail = Buffer.alloc(Math.min(size, 66_000));
    readSync(fd, tail, 0, tail.length, size - tail.length);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) return null;
    const count = tail.readUInt16LE(eocd + 10);
    const cdOffset = tail.readUInt32LE(eocd + 16);
    const cdSize = tail.readUInt32LE(eocd + 12);
    const cd = Buffer.alloc(cdSize);
    readSync(fd, cd, 0, cdSize, cdOffset);

    let p = 0;
    for (let n = 0; n < count; n++) {
      const nameLen = cd.readUInt16LE(p + 28);
      const extraLen = cd.readUInt16LE(p + 30);
      const commentLen = cd.readUInt16LE(p + 32);
      const localOffset = cd.readUInt32LE(p + 42);
      const name = cd.toString('utf8', p + 46, p + 46 + nameLen);
      if (name === wanted) {
        const method = cd.readUInt16LE(p + 10);
        const compressed = cd.readUInt32LE(p + 20);
        const head = Buffer.alloc(30);
        readSync(fd, head, 0, 30, localOffset);
        const lNameLen = head.readUInt16LE(26);
        const lExtraLen = head.readUInt16LE(28);
        const data = Buffer.alloc(compressed);
        readSync(fd, data, 0, compressed, localOffset + 30 + lNameLen + lExtraLen);
        return method === 0 ? data : AdmZipless.inflateRawSync(data);
      }
      p += 46 + nameLen + extraLen + commentLen;
    }
    return null;
  } finally {
    closeSync(fd);
  }
}

const archiveDir = process.argv[2] || '..';
const BRANCH = 'legacy-history';

const zips = readdirSync(archiveDir)
  .filter((f) => f.toLowerCase().endsWith('.zip'))
  .map((f) => join(archiveDir, f))
  .filter((f) => statSync(f).isFile());

const seen = new Map();
const revisions = [];

for (const zip of zips) {
  let body;
  try {
    body = readEntry(zip, 'index.html');
  } catch {
    continue;
  }
  /* Only the single-file reader: the rebuild's index.html is a 400-byte
     shell and belongs to a different lineage entirely. */
  if (!body || body.length < 200_000) continue;
  const sha = createHash('sha256').update(body).digest('hex');
  if (seen.has(sha)) continue;
  seen.set(sha, true);
  revisions.push({ zip, body, when: statSync(zip).mtime, sha: sha.slice(0, 12) });
}

revisions.sort((a, b) => a.when.getTime() - b.when.getTime());
console.log(`${zips.length} archives, ${revisions.length} distinct versions of the reader\n`);

const git = (args, env) =>
  execFileSync('git', args, { stdio: 'pipe', env: { ...process.env, ...env } }).toString();

const branches = git(['branch', '--list', BRANCH]).trim();
if (branches) {
  console.error(`${BRANCH} already exists — delete it first if you mean to rebuild it`);
  process.exit(1);
}

const original = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
if (git(['status', '--porcelain']).trim()) {
  console.error('working tree is dirty — commit or stash first');
  process.exit(1);
}

/* Everything below runs inside try/finally.
 *
 * The first version did not, threw partway through, and left the repo
 * checked out on a half-built orphan branch with a dirty tree — which is
 * a nasty thing for a tool to do to a repository that is meant to be the
 * safety net. Whatever happens, we end up back where we started. */
let n = 0;
try {
  git(['checkout', '--orphan', BRANCH]);
  git(['rm', '-rf', '--cached', '.']);
  mkdirSync('legacy', { recursive: true });
  for (const rev of revisions) {
    writeFileSync('legacy/index.html', rev.body);
    git(['add', 'legacy/index.html']);
    const label = rev.zip
      .split(/[\\/]/)
      .pop()
      .replace(/\.zip$/i, '');
    const stamp = rev.when.toISOString();
    git(
      [
        '-c',
        'user.name=archive import',
        '-c',
        'user.email=noreply@localhost',
        'commit',
        '-q',
        '--allow-empty',
        '-m',
        `${label}\n\nRecovered from ${label}.zip, ${stamp}\nsha256:${rev.sha}`,
      ],
      { GIT_AUTHOR_DATE: stamp, GIT_COMMITTER_DATE: stamp }
    );
    n += 1;
    console.log(`  ${String(n).padStart(2)}. ${stamp.slice(0, 16)}  ${label}`);
  }
} catch (err) {
  console.error(`\nstopped after ${n} of ${revisions.length}:`);
  console.error(String(err.stderr || err.message || err).trim());
  process.exitCode = 1;
} finally {
  /* back to where we started, whatever happened above */
  try {
    git(['checkout', '-f', original]);
  } catch {
    console.error(`could not return to ${original} — you are on ${BRANCH}`);
  }
  if (existsSync('legacy-dist')) rmSync('legacy-dist', { recursive: true, force: true });
}

if (n === revisions.length) {
  console.log(`\n${n} revisions on ${BRANCH}; back on ${original}`);
  console.log('  git log --oneline legacy-history');
  console.log('  git diff legacy-history~5 legacy-history -- legacy/index.html');
}
