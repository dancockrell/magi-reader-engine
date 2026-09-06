import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const ffmpeg = resolve(root, 'tools/ffmpeg/bin/ffmpeg.exe');
const ffprobe = resolve(root, 'tools/ffmpeg/bin/ffprobe.exe');
const raw = 'production/magnific/gift-of-the-magi/scene-1/raw/';
const repair = 'production/magnific/gift-of-the-magi/scene-1/v10/';
const pickup = 'production/magnific/gift-of-the-magi/scene-1/v11/';
const output = resolve(root, 'public/video/films/magi-opening-v11');
const title = 'production/magnific/gift-of-the-magi/opening-v11-title.ass';
const fps = 24;

// Exclusive out frames. The book-opening pickup replaces the confusing shop
// material and moves to the head of the scene. Every picture frame is native
// source motion: no holds, loops, interpolation, reversal, or speed fitting.
const shots = [
  { name: 'The story opens', path: pickup + 's1-book-opening-v11-raw.mp4', in: 0, out: 37 },
  { name: 'The pages turn', path: pickup + 's1-book-opening-v11-raw.mp4', in: 49, out: 223, dissolve: 6 },
  { name: 'The illustration becomes real pennies', path: raw + 's1-pennies-v8.mp4', in: 0, out: 120, dissolve: 8 },
  { name: 'Della at the table', path: repair + 's1-counting-clean-v10-raw.mp4', in: 0, out: 121 },
  { name: 'The walk home', path: raw + 's1-winter-walk-v8.mp4', in: 0, out: 121 },
  { name: 'Third count setup', path: 'public/video/storyboard/s1/s1-c-recount.mp4', in: 0, out: 44, dissolve: 6 },
  { name: 'The final penny', path: repair + 's1-recount-v10-raw.mp4', in: 0, out: 121 },
  { name: 'Toward the sofa', path: repair + 's1-turn-to-sofa-v10-raw.mp4', in: 0, out: 121 },
  { name: 'The collapse', path: repair + 's1-sofa-cry-v10-raw.mp4', in: 0, out: 121 },
  { name: 'Sobs, sniffles, smiles', path: raw + 's1-tear-v8.mp4', in: 0, out: 241 },
];

function run(binary, args) {
  const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || 'Media command failed');
  return result.stdout;
}

for (const shot of shots) {
  const stream = JSON.parse(run(ffprobe, [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate,nb_frames', '-of', 'json', shot.path,
  ])).streams[0];
  if (stream.r_frame_rate !== '24/1' || Number(stream.nb_frames) < shot.out) {
    throw new Error(`Native 24fps / source-length gate failed: ${shot.path}`);
  }
}

for (let i = 0; i < shots.length; i++) {
  for (let j = i + 1; j < shots.length; j++) {
    if (shots[i].path === shots[j].path && shots[i].in < shots[j].out && shots[j].in < shots[i].out) {
      throw new Error('Repeated source frames are not allowed');
    }
  }
}

const filters = shots.map((shot, i) =>
  `[${i}:v]trim=start_frame=${shot.in}:end_frame=${shot.out},setpts=PTS-STARTPTS,` +
  `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih),setsar=1,settb=AVTB[v${i}]`
);
let label = 'v0';
let frames = shots[0].out - shots[0].in;
shots[0].timelineStart = 0;
for (let i = 1; i < shots.length; i++) {
  const shot = shots[i];
  const next = `cut${i}`;
  const overlap = shot.dissolve || 0;
  shot.timelineStart = (frames - overlap) / fps;
  filters.push(overlap
    ? `[${label}][v${i}]xfade=transition=fade:duration=${overlap / fps}:offset=${shot.timelineStart}[${next}]`
    : `[${label}][v${i}]concat=n=2:v=1:a=0[${next}]`);
  frames += shot.out - shot.in - overlap;
  label = next;
}
filters.push(`[${label}]subtitles=${title}[titled]`);

const duration = frames / fps;
mkdirSync(resolve(root, 'public/video/films'), { recursive: true });
run(ffmpeg, [
  '-y', '-v', 'error', '-filter_complex_threads', '1', ...shots.flatMap((shot) => ['-i', shot.path]),
  '-filter_complex', filters.join(';'), '-map', '[titled]', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output + '-silent.mp4',
]);

const voices = Array.from({ length: 16 }, (_, i) => `public/magi-audio/n_s1_${i}.mp3`);
const lines = JSON.parse(readFileSync(resolve(root, 'src/books/magi/book.json'), 'utf8')).units[0].stanzas.join('\n').split('\n')
  .map((line) => line.replace(/\{([^|}]+)\|[^}]+\}/g, '$1'));
let voiceTime = 0;
const stamp = (seconds) => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
const cues = voices.map((path, i) => {
  const length = Number(run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nokey=1:noprint_wrappers=1', path]).trim());
  const start = voiceTime;
  voiceTime += length;
  return `${stamp(start)} --> ${stamp(voiceTime)}\n${lines[i]}\n`;
});
writeFileSync(output + '.vtt', 'WEBVTT\n\n' + cues.join('\n'));

const voiceFilters = voices.map((_, i) => `[${i + 1}:a]aresample=48000,asetpts=PTS-STARTPTS[a${i}]`);
voiceFilters.push(`${voices.map((_, i) => `[a${i}]`).join('')}concat=n=16:v=0:a=1[voice]`);
voiceFilters.push(`[17:a]atrim=duration=${duration},asetpts=PTS-STARTPTS,volume=0.11,afade=t=in:d=1,afade=t=out:st=${duration - 2}:d=2[score]`);
voiceFilters.push('[voice][score]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95:level=false[mix]');
run(ffmpeg, [
  '-y', '-v', 'error', '-i', output + '-silent.mp4', ...voices.flatMap((path) => ['-i', path]), '-i', 'public/audio/magi-score.mp3',
  '-filter_complex', voiceFilters.join(';'), '-map', '0:v', '-map', '[mix]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
  '-t', String(duration), '-movflags', '+faststart', output + '-preview.mp4',
]);

writeFileSync(resolve(root, 'production/magnific/gift-of-the-magi/opening-v11-edit.json'), JSON.stringify({
  fps, frames, duration,
  scope: 'Final opening: title and book-open pickup replaces the confusing shop sequence; visible breath remains excluded',
  video: 'public/video/films/magi-opening-v11-silent.mp4',
  preview: 'public/video/films/magi-opening-v11-preview.mp4',
  voiceFiles: voices,
  shots,
}, null, 2) + '\n');
console.log(`Opening v11 baked: ${frames} native frames, ${duration.toFixed(3)} seconds.`);
