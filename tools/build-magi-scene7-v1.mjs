import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const ffmpeg = resolve(root, 'tools/ffmpeg/bin/ffmpeg.exe');
const ffprobe = resolve(root, 'tools/ffmpeg/bin/ffprobe.exe');
const raw = 'production/magnific/gift-of-the-magi/scene-7/raw/';
const output = resolve(root, 'public/video/films/magi-scene7-v1');
const fps = 24;
const shots = [
  { name: 'Excitement gives way to prudence', path: raw + '01-arrival.mp4', in: 0, out: 240 },
  { name: 'Approaching the mirror', path: raw + '02-mirror-r3.mp4', in: 79, out: 241 },
  { name: 'Smoothing her own short hair', path: raw + '03-smoothing-r3.mp4', in: 0, out: 216 },
  { name: 'The final curl', path: raw + '04-final-curl-r2.mp4', in: 0, out: 240 },
  { name: 'A schoolboy in the glass', path: raw + '05-mirror-review-r2.mp4', in: 0, out: 216 },
  { name: 'What could I do?', path: raw + '06-worry.mp4', in: 0, out: 207 },
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

mkdirSync(resolve(root, 'public/video/films'), { recursive: true });
run(ffmpeg, [
  '-y', '-v', 'error', ...shots.flatMap((shot) => ['-i', shot.path]),
  '-filter_complex', filters.join(';'), '-map', '[picture]', '-an',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', output + '-silent.mp4',
]);

const unit = JSON.parse(readFileSync(resolve(root, 'src/books/magi/book.json'), 'utf8')).units[6];
const lines = unit.stanzas.join('\n').split('\n').map((line) => line.replace(/\{([^|}]+)\|[^}]+\}/g, '$1'));
const voices = lines.map((_, i) => `public/magi-audio/n_s7_${i}.mp3`);
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
  resolve(root, 'production/magnific/gift-of-the-magi/scene-7/edit-v1.json'),
  JSON.stringify({ fps, frames, duration, narrationSeconds: voiceTime, shots, voices }, null, 2) + '\n'
);
console.log(`Scene 7 baked: ${frames} native frames, ${duration.toFixed(3)} seconds; narration ${voiceTime.toFixed(3)} seconds.`);
