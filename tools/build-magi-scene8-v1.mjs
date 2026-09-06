import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const ffmpeg = resolve(root, 'tools/ffmpeg/bin/ffmpeg.exe');
const ffprobe = resolve(root, 'tools/ffmpeg/bin/ffprobe.exe');
const raw = 'production/magnific/gift-of-the-magi/scene-8/raw/';
const output = resolve(root, 'public/video/films/magi-scene8-v1');
const fps = 24;
const shots = [
  { name: 'Coffee and the chops', path: raw + '01-coffee-pan.mp4', in: 0, out: 222 },
  { name: 'Jim was never late', path: raw + '03-clock-seven.mp4', in: 0, out: 48 },
  { name: 'Waiting with the chain', path: raw + '04-waiting-chain.mp4', in: 0, out: 186 },
  { name: 'Jim climbs home', path: raw + '07-jim-stairs.mp4', in: 24, out: 120 },
  { name: 'A step on the stair', path: raw + '05-hears-step.mp4', in: 0, out: 132 },
  { name: 'A whispered prayer', path: raw + '06-prayer.mp4', in: 0, out: 240 },
  { name: 'The door opens', path: 'production/polish-r4/raw/entrance.mp4', in: 0, out: 132 },
  { name: 'Young and burdened', path: raw + '10-jim-weary-r3.mp4', in: 48, out: 240 },
  { name: 'Della searches his face', path: raw + '11-della-search-r3.mp4', in: 48, out: 240 },
  { name: 'The stare', path: raw + '09-stare.mp4', in: 0, out: 192, crop: '1280:720:640:0' },
  { name: 'An expression she cannot read', path: raw + '13-della-fear-r3.mp4', in: 0, out: 218 },
  { name: 'Jim cannot find words', path: raw + '12-jim-silence-r3.mp4', in: 48, out: 241 },
];

function run(binary, args) {
  const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || 'Media command failed');
  return result.stdout;
}

for (const shot of shots) {
  const stream = JSON.parse(run(ffprobe, [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=r_frame_rate,nb_frames', '-of', 'json', shot.path,
  ])).streams[0];
  if (stream.r_frame_rate !== '24/1' || Number(stream.nb_frames) < shot.out) {
    throw new Error(`Native 24fps / source-length gate failed: ${shot.path}`);
  }
}

const filters = shots.map((shot, i) =>
  `[${i}:v]trim=start_frame=${shot.in}:end_frame=${shot.out},setpts=PTS-STARTPTS,` +
  (shot.crop ? `crop=${shot.crop},` : '') +
  `scale=1920:1080:force_original_aspect_ratio=decrease,` +
  `pad=1920:1080:(ow-iw)/2:(oh-ih),setsar=1,settb=AVTB[v${i}]`
);
filters.push(`${shots.map((_, i) => `[v${i}]`).join('')}concat=n=${shots.length}:v=1:a=0[picture]`);
let cursor = 0;
for (const shot of shots) {
  shot.timelineStart = cursor / fps;
  cursor += shot.out - shot.in;
  shot.timelineEnd = cursor / fps;
}
const frames = cursor;
const duration = frames / fps;
if (frames !== 2043) throw new Error('Waiting scene must preserve full-film timing');
if (Math.abs(shots.find(shot => shot.name === 'The door opens').timelineStart - 38.592) > 0.25)
  throw new Error('Jim entrance no longer matches the narration');

mkdirSync(resolve(root, 'public/video/films'), { recursive: true });
run(ffmpeg, [
  '-y', '-v', 'error', ...shots.flatMap((shot) => ['-i', shot.path]),
  '-filter_complex', filters.join(';'), '-map', '[picture]', '-an',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', output + '-silent.mp4',
]);

const unit = JSON.parse(readFileSync(resolve(root, 'src/books/magi/book.json'), 'utf8')).units[7];
const lines = unit.stanzas.join('\n').split('\n').map((line) => line.replace(/\{([^|}]+)\|[^}]+\}/g, '$1'));
const voices = lines.map((_, i) => `public/magi-audio/n_s8_${i}.mp3`);
let voiceTime = 0;
const stamp = (seconds) => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
const cues = voices.map((path, i) => {
  const length = Number(run(ffprobe, [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nokey=1:noprint_wrappers=1', path,
  ]).trim());
  const start = voiceTime;
  voiceTime += length;
  return `${stamp(start)} --> ${stamp(voiceTime)}\n${lines[i]}\n`;
});
writeFileSync(output + '.vtt', 'WEBVTT\n\n' + cues.join('\n'));

const audioFilters = voices.map((_, i) => `[${i + 1}:a]aresample=48000,asetpts=PTS-STARTPTS[a${i}]`);
audioFilters.push(`${voices.map((_, i) => `[a${i}]`).join('')}concat=n=${voices.length}:v=0:a=1[voice]`);
audioFilters.push(
  `[${voices.length + 1}:a]atrim=duration=${duration},asetpts=PTS-STARTPTS,volume=0.11,` +
  `afade=t=in:d=1,afade=t=out:st=${duration - 2}:d=2[score]`
);
audioFilters.push('[voice][score]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95:level=false[mix]');
run(ffmpeg, [
  '-y', '-v', 'error', '-i', output + '-silent.mp4',
  ...voices.flatMap((path) => ['-i', path]), '-i', 'public/audio/magi-score.mp3',
  '-filter_complex', audioFilters.join(';'), '-map', '0:v', '-map', '[mix]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(duration),
  '-movflags', '+faststart', output + '-preview.mp4',
]);

writeFileSync(
  resolve(root, 'production/magnific/gift-of-the-magi/scene-8/edit-v1.json'),
  JSON.stringify({ fps, frames, duration, narrationSeconds: voiceTime, shots, voices }, null, 2) + '\n'
);
console.log(`Scene 8 baked: ${frames} native frames, ${duration.toFixed(3)} seconds; narration ${voiceTime.toFixed(3)} seconds.`);
