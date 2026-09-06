import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const ffmpeg = resolve(root, 'tools/ffmpeg/bin/ffmpeg.exe');
const ffprobe = resolve(root, 'tools/ffmpeg/bin/ffprobe.exe');
const source = 'public/video/films/magi-opening-v9-silent.mp4';
const output = resolve(root, 'public/video/films/magi-scene2-v1');
const fps = 24;
const startFrame = 1201;
const endFrame = 2851;
const frames = endFrame - startFrame;
const duration = frames / fps;

function run(binary, args) {
  const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || 'Media command failed');
  return result.stdout;
}

run(ffmpeg, ['-y', '-v', 'error', '-i', source,
  '-vf', `trim=start_frame=${startFrame}:end_frame=${endFrame},setpts=PTS-STARTPTS`,
  '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-r', String(fps), '-movflags', '+faststart', output + '-silent.mp4']);

const unit = JSON.parse(readFileSync(resolve(root, 'src/books/magi/book.json'), 'utf8')).units[1];
const lines = unit.stanzas.join('\n').split('\n').map((line) => line.replace(/\{([^|}]+)\|[^}]+\}/g, '$1'));
const voices = lines.map((_, i) => `public/magi-audio/n_s2_${i}.mp3`);
const stamp = (seconds) => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
let voiceTime = 0;
const cues = voices.map((path, i) => {
  const length = Number(run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nokey=1:noprint_wrappers=1', path]).trim());
  const start = voiceTime;
  voiceTime += length;
  return `${stamp(start)} --> ${stamp(voiceTime)}\n${lines[i]}\n`;
});
writeFileSync(output + '.vtt', 'WEBVTT\n\n' + cues.join('\n'));

const audioFilters = voices.map((_, i) => `[${i + 1}:a]aresample=48000,asetpts=PTS-STARTPTS[a${i}]`);
audioFilters.push(`${voices.map((_, i) => `[a${i}]`).join('')}concat=n=${voices.length}:v=0:a=1[voice]`);
audioFilters.push(`[${voices.length + 1}:a]atrim=duration=${duration},asetpts=PTS-STARTPTS,volume=0.11,afade=t=in:d=1,afade=t=out:st=${duration - 2}:d=2[score]`);
audioFilters.push('[voice][score]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95:level=false[mix]');
run(ffmpeg, ['-y', '-v', 'error', '-i', output + '-silent.mp4', ...voices.flatMap((path) => ['-i', path]),
  '-i', 'public/audio/magi-score.mp3', '-filter_complex', audioFilters.join(';'), '-map', '0:v', '-map', '[mix]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(duration), '-movflags', '+faststart', output + '-preview.mp4']);

writeFileSync(resolve(root, 'production/magnific/gift-of-the-magi/scene-2/scene2-v1-edit.json'), JSON.stringify({
  fps, frames, duration, narrationSeconds: voiceTime, source, startFrame, endFrame, voices,
  rules: ['Native 24 fps extraction', 'No loop, hold, reversal, interpolation, or speed fitting']
}, null, 2) + '\n');
console.log(`Scene 2 baked: ${frames} native frames, ${duration.toFixed(3)} seconds; narration ${voiceTime.toFixed(3)} seconds.`);
