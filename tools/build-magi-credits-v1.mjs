import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const ffmpeg = resolve(root, 'tools/ffmpeg/bin/ffmpeg.exe');
const output = resolve(root, 'public/video/films/magi-credits-v1.mp4');
const sources = [
  'production/magnific/gift-of-the-magi/scene-12/raw/01-magi-travel.mp4',
  'production/magnific/gift-of-the-magi/scene-10/raw/06-shop-memory.mp4',
  'production/magnific/gift-of-the-magi/scene-12/raw/06-window-final.mp4',
];
const filter = [
  '[0:v]trim=start_frame=0:end_frame=204,setpts=PTS-STARTPTS,scale=1920:1080,setsar=1[v0]',
  '[1:v]trim=start_frame=0:end_frame=204,setpts=PTS-STARTPTS,scale=1920:1080,setsar=1[v1]',
  '[2:v]trim=start_frame=0:end_frame=204,setpts=PTS-STARTPTS,scale=1920:1080,setsar=1[v2]',
  '[v0][v1]xfade=transition=fade:duration=0.75:offset=7.75[x1]',
  '[x1][v2]xfade=transition=fade:duration=0.75:offset=15.5,' +
    "subtitles=production/magnific/gift-of-the-magi/credits-v1.ass," +
    // Story ends at 857.875s: fade picture and lettering together at 14:40–14:41.
    "fade=t=out:st=22.125:d=1[credits]",
  '[3:a]atrim=duration=24,asetpts=PTS-STARTPTS,volume=0.16,afade=t=in:d=1,afade=t=out:st=21:d=3[score]',
];
const result = spawnSync(ffmpeg, [
  '-y', '-v', 'error', ...sources.flatMap((path) => ['-i', path]),
  '-stream_loop', '-1', '-i', 'public/audio/magi-score.mp3',
  '-filter_complex', filter.join(';'), '-map', '[credits]', '-map', '[score]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-t', '24', '-movflags', '+faststart', output,
], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
if (result.status !== 0) throw new Error(result.stderr || 'Credits build failed');
console.log('Credits coda baked: 24.000 seconds with two 0.75-second dissolves and no holds.');
