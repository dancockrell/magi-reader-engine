/**
 * Package the production reader for itch/static hosting.
 *
 * The version lives in package.json, artifacts land in release/, and the
 * optional --tag flag creates the matching git tag. There is one product
 * now, so there is one release archive.
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

function writeZip(files, root, outPath) {
  const crc32 = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return (buf) => {
      let crc = 0xffffffff;
      for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
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
    const crc = crc32(data);

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

  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length, 8);
  end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  const body = Buffer.concat([...chunks, directory, end]);
  createWriteStream(outPath).end(body);
  return body;
}

function build(root) {
  if (!existsSync(root)) {
    console.error(`${root} does not exist. Run npm run build first.`);
    process.exit(1);
  }

  const files = walk(root);
  if (files.length > ITCH_FILE_LIMIT) {
    console.error(
      `${files.length} files — itch allows ${ITCH_FILE_LIMIT}. Refusing to build an archive it will reject.`
    );
    process.exit(1);
  }
  if (!files.some((file) => relative(root, file) === 'index.html')) {
    console.error('dist has no root index.html — itch requires one.');
    process.exit(1);
  }

  const out = join(outDir, `magi-reader-${version}.zip`);
  const body = writeZip(files, root, out);
  const sha = createHash('sha256').update(body).digest('hex').slice(0, 12);
  console.log(
    `${out}  ${files.length} files  ${(body.length / 1024 / 1024).toFixed(1)} MB  sha256:${sha}`
  );
}

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

console.log(`magi-reader ${version}\n`);
build('dist');

if (process.argv.includes('--tag')) {
  const tag = `v${version}`;
  try {
    execFileSync('git', ['tag', '-a', tag, '-m', `magi-reader ${version}`], {
      stdio: 'inherit',
    });
    console.log(`\ntagged ${tag}`);
  } catch {
    console.error(`\ncould not tag ${tag} — it may already exist`);
    process.exitCode = 1;
  }
}
