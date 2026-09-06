import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(process.argv[2] || '');
const mode = process.argv[3];
if (!process.argv[2] || !['revelation', 'penny', 'stairs', 'full'].includes(mode)) {
  throw new Error('Usage: node build-magi-award-polish-r6.mjs <production-root> revelation|penny|stairs|full');
}
const dir = resolve(root, 'production/award-candidate');
const baseline = 'magi-award-assembly-v5.mp4';
const name = mode === 'full' ? 'magi-award-assembly-v6' : `${mode}-context-r6`;
const output = resolve(dir, name + '.mp4');
const temp = resolve(dir, name + '.rendering.mp4');
if (existsSync(output)) throw new Error('Completed output already exists; review it before creating another revision.');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
if (hash(resolve(dir, baseline)) !== 'f94644244b0036b11d60f579108e75c2067f13a9922f51577ccac5b6033ab3e8') {
  throw new Error('Baseline changed; do not guess source-frame offsets.');
}
const s = (file, start, end, reason) => ({ file, start, end, reason });
const reveal = [
  s('jim-revelation-r1.mp4', 0, 189, 'Jim seated at the narrated couch beat'),
  s('della-listening-r1.mp4', 0, 229, 'Della listens before the watch disclosure'),
  s('jim-revelation-r1.mp4', 189, 360, 'Jim reveals the sacrifice; distinct later source range'),
];
const start = mode === 'penny' ? 699 : mode === 'stairs' ? 11449 : mode === 'revelation' ? 18837 : 0;
const shots = mode === 'full' ? [
  s(baseline, 0, 819, 'Opening and third count setup'),
  s('penny-isolated-r1.mp4', 0, 121, 'One isolated rigid penny'),
  s(baseline, 940, 11569, 'Preserved film through Della waiting'),
  s('jim-ascent-r1.mp4', 0, 96, 'Jim climbs on the visible treads'),
  s(baseline, 11665, 18957, 'Preserved hearing, gifts and request for watch'),
  ...reveal,
  s(baseline, 19546, 21387, 'Magi conclusion and closing fade'),
] : mode === 'revelation' ? [
  s(baseline, 18837, 18957, 'Previous watch request'), ...reveal,
  s(baseline, 19546, 19666, 'Following Magi passage'),
] : mode === 'penny' ? [
  s(baseline, 699, 819, 'Previous reaction and wider count'),
  s('penny-isolated-r1.mp4', 0, 121, 'Isolated penny'),
  s(baseline, 940, 1060, 'Following turn toward sofa'),
] : [
  s(baseline, 11449, 11569, 'Previous waiting'),
  s('jim-ascent-r1.mp4', 0, 96, 'Actual ascent'),
  s(baseline, 11665, 11785, 'Della hears him'),
];
function run(exe, args) {
  const r = spawnSync(resolve(root, 'tools/ffmpeg/bin', exe + '.exe'), args,
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr || `${exe} failed`);
  return r.stdout;
}
const probe = path => JSON.parse(run('ffprobe', ['-v','error','-select_streams','v:0',
  '-show_entries','stream=r_frame_rate,nb_frames,width,height','-of','json',path])).streams[0];
const files = [...new Set([baseline, ...shots.map(x => x.file)])];
const sources = files.map(file => ({ file, sha256: hash(resolve(dir, file)), probe: probe(resolve(dir, file)) }));
const approvedHashes = {
  'penny-isolated-r1.mp4': '2a4dd7f073f49e70950f60383d82fd95e1134a1de58077059642fe94008f5b29',
  'jim-ascent-r1.mp4': 'ae624473916798c5a5e5f80ce5d9dce20212ba76f25114e222a35a6bdc16d585',
  'jim-revelation-r1.mp4': 'fad6ce3e7617f181e82b7e98e0f09a9782061255116498b039d001160f316807',
  'della-listening-r1.mp4': '4b52792ee89b3c46c10997c0e2744191b7aebf7d008422cad6930d6342e0bd3d',
};
for (const source of sources) {
  if (source.file !== baseline && source.sha256 !== approvedHashes[source.file]) {
    throw new Error('Reviewed source changed: ' + source.file);
  }
}
let frames = 0;
for (const shot of shots) {
  const source = sources.find(x => x.file === shot.file);
  if (source.probe.r_frame_rate !== '24/1' || Number(source.probe.nb_frames) < shot.end || shot.start >= shot.end) {
    throw new Error('Native source bounds failed: ' + shot.file);
  }
  shot.timelineStartFrame = frames;
  frames += shot.end - shot.start;
  shot.timelineEndFrame = frames;
}
for (let i = 0; i < shots.length; i++) for (let j = i + 1; j < shots.length; j++) {
  const a = shots[i], b = shots[j];
  if (a.file === b.file && Math.max(a.start, b.start) < Math.min(a.end, b.end)) throw new Error('Repeated source range');
}
if (mode === 'full' && frames !== 21387) throw new Error('Full-film duration changed');
const filters = shots.map((shot, i) => `[${files.indexOf(shot.file)}:v]trim=start_frame=${shot.start}:end_frame=${shot.end},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih),setsar=1,settb=AVTB[v${i}]`);
filters.push(`${shots.map((_, i) => `[v${i}]`).join('')}concat=n=${shots.length}:v=1:a=0[picture]`);
if (mode !== 'full') filters.push(`[0:a]atrim=start=${start / 24}:end=${(start + frames) / 24},asetpts=PTS-STARTPTS[contextAudio]`);
run('ffmpeg', ['-y','-v','error', ...files.flatMap(file => ['-i', resolve(dir,file)]),
  '-filter_complex',filters.join(';'),'-map','[picture]','-map',mode === 'full' ? '0:a:0' : '[contextAudio]',
  '-c:v','libx264','-preset',mode === 'full' ? 'fast' : 'medium','-crf','18','-pix_fmt','yuv420p',
  '-c:a',mode === 'full' ? 'copy' : 'aac', '-movflags','+faststart',temp]);
if (Number(probe(temp).nb_frames) !== frames) throw new Error('Exported frame count mismatch');
run('ffmpeg',['-v','error','-i',temp,'-f','null','-']);
renameSync(temp, output);
if (mode === 'full') copyFileSync(resolve(dir,'magi-award-assembly-v5.vtt'),resolve(dir,name+'.vtt'));
writeFileSync(resolve(dir,name+'.json'), JSON.stringify({
  status:'local review only; not picture-locked, sound-approved or published', mode,
  fps:24, frames, baselineStartFrame:start, pictureSeconds:frames/24, outputSha256:hash(output),
  audio:mode === 'full' ? 'Baseline AAC bitstream copy' : 'Trimmed/re-encoded context only; not a new mix',
  sources, shots,
},null,2)+'\n');
console.log(`${name}: ${frames} frames; decoded and saved. Public film unchanged.`);
