#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function argsOf(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function cleanLine(line) {
  return String(line)
    .replace(/\{([^{}|]+)\|[^{}]+\}/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function linesOf(unit) {
  return (unit.stanzas || [])
    .flatMap((stanza) => String(stanza).split('\n'))
    .map(cleanLine)
    .filter(Boolean);
}

function seconds(stamp) {
  const [hours, minutes, rest] = stamp.split(':');
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(rest);
}

function cueDurations(vtt) {
  const out = new Map();
  const lines = String(vtt).split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i += 1) {
    const id = lines[i].trim();
    const timing = lines[i + 1].trim();
    if (!id || !timing.includes('-->')) continue;
    const match = timing.match(/^(\d\d:\d\d:\d\d\.\d+)\s+-->\s+(\d\d:\d\d:\d\d\.\d+)/);
    if (!match) continue;
    out.set(id, Math.round(seconds(match[2]) * 1000) / 1000);
  }
  return out;
}

function visualSkeleton(unitId, lineIndex, duration) {
  const n = String(lineIndex).padStart(2, '0');
  return {
    start: `art/storyboard/${unitId}/${unitId}-${n}-start.webp`,
    end: '',
    clip: '',
    shot: '',
    camera: '',
    action: '',
    mood: '',
    duration: duration || null,
    status: 'todo',
  };
}

const args = argsOf(process.argv.slice(2));
const bookPath = args.book || 'src/books/magi/book.json';
const cuesPath = args.cues || 'public/cues/magi.vtt';
const outPath = args.out || 'production/storyboards/storyboard-plan.json';
const onlyUnit = args.unit || '';

const [bookText, cuesText] = await Promise.all([
  fs.readFile(bookPath, 'utf8'),
  fs.readFile(cuesPath, 'utf8'),
]);
const book = JSON.parse(bookText);
const durations = cueDurations(cuesText);
const plan = {
  version: 1,
  book: {
    id: book.meta?.id || '',
    title: book.meta?.title || '',
  },
  source: {
    book: bookPath,
    cues: cuesPath,
  },
  units: {},
};

for (const unit of book.units || []) {
  if (onlyUnit && unit.id !== onlyUnit) continue;
  const lines = linesOf(unit);
  plan.units[unit.id] = {
    title: unit.title || unit.id,
    caption: unit.caption || '',
    lines: lines.map((text, i) => {
      const narrationClip = `n_${unit.id}_${i}`;
      return {
        key: `${unit.id}-${i}`,
        text,
        narration: {
          clip: narrationClip,
          duration: durations.get(narrationClip) || null,
        },
        visual: visualSkeleton(unit.id, i, durations.get(narrationClip)),
      };
    }),
  };
}

await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

const units = Object.keys(plan.units);
const lineCount = units.reduce((n, id) => n + plan.units[id].lines.length, 0);
const missingDurations = units.flatMap((id) =>
  plan.units[id].lines.filter((line) => !line.narration.duration).map((line) => line.narration.clip)
);

console.log(`Storyboard plan: ${lineCount} lines across ${units.length} unit(s).`);
console.log(`Wrote ${outPath}.`);
if (missingDurations.length) {
  console.warn(`No cue duration for ${missingDurations.length} narration clip(s):`);
  console.warn(missingDurations.join(', '));
  process.exitCode = 2;
}
