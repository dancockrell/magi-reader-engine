import { createReadStream, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// This is a screening excerpt, never an automatic replacement of the master.
const [rootArg, reassuranceHash] = process.argv.slice(2);
if (!rootArg || !/^[a-f0-9]{64}$/.test(reassuranceHash || '')) {
  throw new Error('Production root and inspected reassurance SHA-256 hash are required');
}
const root = resolve(rootArg);
const dir = resolve(root, 'production/award-candidate');
const name = 'parcel-context-r8-reassurance-only';
const output = resolve(dir, `${name}.mp4`);
if (existsSync(output)) throw new Error('Preserve the completed review excerpt');
const base = resolve(dir, 'magi-award-assembly-v6.mp4');
// Both new toss takes failed physical/story review. Never assemble them here.
const sources = [resolve(dir, 'parcel-reassurance-r8.mp4')];
async function hash(file) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}
const baseHash = await hash(base);
if (baseHash !== '852574ecb47757dd45b3d56293ec05b6af0547efcdbd5257b71e083997b3ef3b') throw new Error('Baseline changed');
for (let i = 0; i < sources.length; i++) {
  if (await hash(sources[i]) !== reassuranceHash) throw new Error('Inspected source changed');
}
function run(exe, args) {
  const result = spawnSync(resolve(root, `tools/ffmpeg/bin/${exe}.exe`), args,
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || `${exe} failed`);
  return result.stdout;
}
const probe = file => JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
  '-show_entries', 'stream=width,height,r_frame_rate,nb_frames', '-of', 'json', file])).streams[0];
for (const source of sources) {
  const p = probe(source);
  if (p.r_frame_rate !== '24/1' || p.width !== 1920 || p.height !== 1080 || Number(p.nb_frames) < 224) {
    throw new Error('Expected inspected native 1080p/24 take with sufficient frames; never retime');
  }
}
const startFrame = 15942; // Four seconds before the original parcel shot.
const frames = 960;
const filter = [
  '[0:v]split=2[before][after]',
  '[before]trim=start_frame=0:end_frame=320,setpts=PTS-STARTPTS,setsar=1,settb=AVTB[v0]',
  '[1:v]trim=start_frame=0:end_frame=224,setpts=PTS-STARTPTS,crop=1536:864:192:0,scale=1920:1080:flags=lanczos,setsar=1,settb=AVTB[v2]',
  '[after]trim=start_frame=544:end_frame=960,setpts=PTS-STARTPTS,setsar=1,settb=AVTB[v3]',
  '[v0][v2][v3]concat=n=3:v=1:a=0[v]',
  '[0:a]atrim=start=0:end=40,asetpts=PTS-STARTPTS[a]',
].join(';');
const temp = resolve(dir, `${name}.rendering.mp4`);
run('ffmpeg', ['-v', 'error', '-n', '-threads', '2', '-ss', String(startFrame / 24), '-i', base,
  ...sources.flatMap(source => ['-threads', '2', '-i', source]),
  '-filter_complex_threads', '1', '-filter_complex', filter, '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p',
  '-video_track_timescale', '12288', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', temp]);
if (Number(probe(temp).nb_frames) !== frames) throw new Error('Unexpected excerpt frame count');
run('ffmpeg', ['-v', 'error', '-threads', '2', '-i', temp, '-f', 'null', '-']);
renameSync(temp, output);
const timestamp = value => new Date(Math.round(value * 1000)).toISOString().slice(11, 23);
const seconds = value => value.split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
const cues = readFileSync(resolve(dir, 'magi-award-assembly-v6.vtt'), 'utf8').split(/\r?\n\r?\n/).flatMap(block => {
  const lines = block.split(/\r?\n/), match = lines[0]?.match(/([\d:.]+) --> ([\d:.]+)/);
  if (!match) return [];
  const start = seconds(match[1]) - startFrame / 24, end = seconds(match[2]) - startFrame / 24;
  if (end <= 0 || start >= 40) return [];
  return [`${timestamp(Math.max(0, start))} --> ${timestamp(Math.min(40, end))}\n${lines.slice(1).join('\n')}`];
});
writeFileSync(resolve(dir, `${name}.vtt`), 'WEBVTT\n\n' + cues.join('\n\n') + '\n');
writeFileSync(resolve(dir, `${name}.json`), JSON.stringify({
  status: 'Reassurance-only local audition; original toss and unwrap/reaction defects remain; both generated toss takes rejected',
  baseline: 'magi-award-assembly-v6.mp4', baselineHash: baseHash, baselineStartFrame: startFrame,
  fps: 24, frames, replacementBaselineRange: [16262, 16486],
  takes: [
    { file: 'parcel-reassurance-r8.mp4', sha256: reassuranceHash, creation: '3zMfvq5REY', range: [0, 224], mandatoryCrop: '1536:864:192:0' },
  ],
  audio: 'Original v6 mix, excerpted and AAC re-encoded; no narrator replacement',
  outputHash: await hash(output),
}, null, 2) + '\n');
console.log('40-second reassurance-only audition baked and decoded. Rejected tosses excluded; user screening and public film untouched.');
