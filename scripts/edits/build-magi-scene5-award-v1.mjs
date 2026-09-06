import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Pass the production asset workspace explicitly. This never replaces the live master.
if (!process.argv[2]) throw new Error('Usage: node build-magi-scene5-award-v1.mjs <production-root>');
const root = resolve(process.argv[2]);
const bin = resolve(root, 'tools/ffmpeg/bin');
const candidate = 'production/award-candidate/';
const raw = 'production/magnific/gift-of-the-magi/scene-5/raw/';
const hairRevision = process.argv.includes('--hair-r3');
const output = resolve(root, candidate, hairRevision ? 'scene5-award-v2' : 'scene5-award-v1');
const fps = 24;
const shots = [
  { name: 'Resolve on the descent', path: candidate + 'departure-omni.mp4', in: 36, out: 144, creation: 'iGVtYXh3uK' },
  { name: 'A single outward departure', path: candidate + 'departure-exterior-r2.mp4', in: 1, out: 193, creation: '3zMh05JREY' },
  { name: 'The hair-goods address', path: raw + '02-shop-exterior-r3.mp4', in: 12, out: 228 },
  { name: 'Up toward the shop; cut before the landing turn', path: raw + 's5-stair-climb.mp4', in: 3, out: 84 },
  ...(hairRevision ? [
    { name: 'Asking with hair still pinned', path: candidate + 'shop-conversation-r3.mp4', in: 0, out: 264, creation: '5j7ZB4TKxe' },
    { name: 'Remove the hat once; begin unpinning', path: candidate + 'shop-reveal-r3.mp4', in: 0, out: 72, creation: 'JNGeHc5Oq4' },
    { name: 'Ellipsis to released hair and appraisal; exclude returned hat', path: raw + '05-inspection.mp4', in: 72, out: 240, crop: '1600:900:200:0', creation: 'XmQkO7nBfo' },
  ] : [
    { name: 'Asking the difficult question', path: candidate + 'shop-conversation-r2.mp4', in: 0, out: 264, creation: 'p8CrfRWehw' },
    { name: 'The hair revealed and appraised', path: raw + '05-inspection.mp4', in: 0, out: 240, creation: 'XmQkO7nBfo' },
  ]),
  { name: 'The decision; cut away before the haircut', path: candidate + 'della-decision-r2.mp4', in: 0, out: 120, creation: 'yinXzkyPW9' },
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
  if (stream.r_frame_rate !== '24/1' || Number(stream.nb_frames) < shot.out || shot.in < 0 || shot.in >= shot.out) {
    throw new Error(`Native source/range check failed: ${shot.path}`);
  }
  shot.sha256 = createHash('sha256').update(readFileSync(resolve(root, shot.path))).digest('hex');
  shot.timelineStart = frames / fps;
  frames += shot.out - shot.in;
  shot.timelineEnd = frames / fps;
}
if (frames !== 1221) throw new Error('Candidate must preserve the 1221-frame chapter and downstream timing.');
mkdirSync(resolve(root, candidate), { recursive: true });
const filters = shots.map((s,i) => `[${i}:v]trim=start_frame=${s.in}:end_frame=${s.out},setpts=PTS-STARTPTS,${s.crop ? `crop=${s.crop},` : ''}scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih),setsar=1,settb=AVTB[v${i}]`);
filters.push(`${shots.map((_,i)=>`[v${i}]`).join('')}concat=n=${shots.length}:v=1:a=0[picture]`);
run('ffmpeg', ['-y','-v','error',...shots.flatMap(s=>['-i',s.path]),'-filter_complex',filters.join(';'),'-map','[picture]','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',output+'-silent.mp4']);
if (Number(probe(output+'-silent.mp4').nb_frames) !== frames) throw new Error('Rendered frame count changed.');
// Retain the exact existing mix for this editorial comparison; it is NOT the final sound pass.
run('ffmpeg', ['-y','-v','error','-i',output+'-silent.mp4','-i','public/video/films/magi-scene5-v1-preview.mp4','-map','0:v:0','-map','1:a:0','-c','copy','-t',String(frames/fps),'-movflags','+faststart',output+'.mp4']);
copyFileSync(resolve(root,'public/video/films/magi-scene5-v1.vtt'),output+'.vtt');
run('ffmpeg',['-v','error','-i',output+'.mp4','-f','null','-']);
writeFileSync(output+'.json', JSON.stringify({ status:'local editorial candidate; not published', fps, frames, seconds:frames/fps, filmStartSeconds:286.208333, audio:'Unchanged v1 chapter mix; final sound review pending', shots },null,2)+'\n');
console.log(`Local candidate: ${frames} frames, ${frames/fps} seconds. Public movie unchanged.`);
