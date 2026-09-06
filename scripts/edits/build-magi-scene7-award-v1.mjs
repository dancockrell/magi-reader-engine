import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// A local comparison render, never the app's live master.
if (!process.argv[2]) throw new Error('Usage: node build-magi-scene7-award-v1.mjs <production-root>');
const root = resolve(process.argv[2]);
const bin = resolve(root, 'tools/ffmpeg/bin');
const candidate = 'production/award-candidate/';
const raw = 'production/magnific/gift-of-the-magi/scene-7/raw/';
const output = resolve(root, candidate, 'scene7-award-v1');
const shots = [
  { name: 'Prudence after arriving home', path: raw + '01-arrival.mp4', in: 0, out: 201 },
  { name: 'Practical concentration; work remains offscreen', path: candidate + 'waiting-preparation-r2.mp4', in: 0, out: 240, creation: 'lJi0V6ogv9' },
  { name: 'One act of care; discard lingering opening', path: candidate + 'waiting-care-r1.mp4', in: 48, out: 168, creation: 'SyRVWmsUb8' },
  { name: 'The finished curls', path: raw + '05-mirror-review-r2.mp4', in: 24, out: 216 },
  { name: 'Critical inspection and fear of his response', path: raw + '06-worry.mp4', in: 0, out: 240, crop: '1280:720:80:0', note: 'Mandatory framing excludes the narratively impossible pocket watch; reduced detail requires review.' },
  { name: 'A brave smile, then what else could I do?', path: candidate + 'waiting-portrait-r1.mp4', in: 0, out: 288, creation: 'bxwRNMk5Y2' },
];
function run(exe, args) {
  const result = spawnSync(resolve(bin, exe + '.exe'), args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || `${exe} failed`);
  return result.stdout;
}
function probe(path) {
  return JSON.parse(run('ffprobe', ['-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_frames','-of','json',path])).streams[0];
}
let frames = 0;
for (const shot of shots) {
  const stream = probe(shot.path);
  if (stream.r_frame_rate !== '24/1' || Number(stream.nb_frames) < shot.out || shot.in < 0 || shot.in >= shot.out) throw new Error(`Invalid native source/range: ${shot.path}`);
  shot.sha256 = createHash('sha256').update(readFileSync(resolve(root, shot.path))).digest('hex');
  shot.timelineStart = frames / 24;
  frames += shot.out - shot.in;
  shot.timelineEnd = frames / 24;
}
if (frames !== 1281) throw new Error('Preserve chapter duration and downstream narration timing.');
mkdirSync(resolve(root, candidate), { recursive: true });
const filters = shots.map((s,i) => `[${i}:v]trim=start_frame=${s.in}:end_frame=${s.out},setpts=PTS-STARTPTS,${s.crop ? `crop=${s.crop},` : ''}scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih),setsar=1,settb=AVTB[v${i}]`);
filters.push(`${shots.map((_,i)=>`[v${i}]`).join('')}concat=n=${shots.length}:v=1:a=0[picture]`);
run('ffmpeg', ['-y','-v','error',...shots.flatMap(s=>['-i',s.path]),'-filter_complex',filters.join(';'),'-map','[picture]','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',output+'-silent.mp4']);
if (Number(probe(output+'-silent.mp4').nb_frames) !== frames) throw new Error('Rendered frame count changed.');
// The unchanged mix isolates the picture edit for comparison, not final sound approval.
run('ffmpeg', ['-y','-v','error','-i',output+'-silent.mp4','-i','public/video/films/magi-scene7-v1-preview.mp4','-map','0:v:0','-map','1:a:0','-c','copy','-t',String(frames/24),'-movflags','+faststart',output+'.mp4']);
copyFileSync(resolve(root,'public/video/films/magi-scene7-v1.vtt'),output+'.vtt');
run('ffmpeg',['-v','error','-i',output+'.mp4','-f','null','-']);
writeFileSync(output+'.json', JSON.stringify({ status:'local editorial comparison; not published or final admission', fps:24, frames, seconds:frames/24, filmStartSeconds:409.666667, audio:'Existing comparison mix; final sound pass pending', shots },null,2)+'\n');
console.log(`Local comparison: ${frames} frames, ${frames/24} seconds. Public movie unchanged.`);
