/**
 * Build a release, named by its version.
 *
 * This exists because the alternative was 64 archives and 1.5 GB in a
 * Downloads folder — magi-itch-improved (17) through (21), plus -fixed
 * through -fixed8, plus -guide2 and -guide2-clean and -nocaptions and
 * -scrub and -gate and -legible. Every one of them was a build I named
 * by hand after whatever I had just changed, which is a version number
 * with none of the properties that make version numbers useful: you
 * cannot tell which is newest, which contains what, or which one is
 * running on itch.
 *
 * So: the version lives in package.json, git tags it, and the artifact
 * is named from it. One name per release, and the name says what it is.
 *
 *   npm run release            both targets at the current version
 *   npm run release -- --tag   also create the git tag
 *
 * Artifacts land in release/ and are gitignored — they are derived, and
 * the tag is what is durable.
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
const outDir = 'release';

/** itch refuses a zip with more than this many entries. */
const ITCH_FILE_LIMIT = 1000;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/**
 * Minimal store-only ZIP writer.
 *
 * Entry names use forward slashes. A backslash here is what silently
 * broke an earlier upload — the spec allows only '/', and readers that
 * accept '\' are being generous rather than correct.
 */
function writeZip(files, root, outPath) {
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return (buf) => {
      let crc = 0xffffffff;
      for (const b of buf) crc = t[(crc ^ b) & 0xff] ^ (crc >>> 8);
      return (crc ^ 0xffffffff) >>> 0;
    };
  })();

  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = relative(root, file).split(sep).join('/');
    const nameBuf = Buffer.from(name, 'utf8');
    const data = readFileSync(file);
    const crc = CRC(data);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    nameBuf.copy(local, 30);

    const dir = Buffer.alloc(46 + nameBuf.length);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    nameBuf.copy(dir, 46);

    chunks.push(local, data);
    central.push(dir);
    offset += local.length + data.length;
  }

  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length, 8);
  end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);

  const body = Buffer.concat([...chunks, cd, end]);
  createWriteStream(outPath).end(body);
  return body;
}

function build(name, root) {
  if (!existsSync(root)) {
    console.error(`skipped ${name}: ${root} does not exist`);
    return null;
  }
  const files = walk(root);
  if (files.length > ITCH_FILE_LIMIT) {
    console.error(
      `${name}: ${files.length} files — itch allows ${ITCH_FILE_LIMIT}. Refusing to build a zip it will reject.`
    );
    process.exit(1);
  }
  if (!files.some((f) => relative(root, f) === 'index.html')) {
    console.error(`${name}: no index.html at the root — itch requires one`);
    process.exit(1);
  }

  const out = join(outDir, `magi-reader-${version}-${name}.zip`);
  const body = writeZip(files, root, out);
  const sha = createHash('sha256').update(body).digest('hex').slice(0, 12);
  console.log(
    `${out.padEnd(46)} ${String(files.length).padStart(4)} files  ${String(
      (body.length / 1024 / 1024).toFixed(1)
    ).padStart(5)} MB  sha256:${sha}`
  );
  return out;
}

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

console.log(`magi-reader ${version}\n`);
build('reader', 'dist');
build('legacy', 'legacy-dist');

if (process.argv.includes('--tag')) {
  const tag = `v${version}`;
  try {
    execFileSync('git', ['tag', '-a', tag, '-m', `magi-reader ${version}`], {
      stdio: 'inherit',
    });
    console.log(`\ntagged ${tag}`);
  } catch {
    console.error(`\ncould not tag ${tag} — it may already exist`);
  }
}
