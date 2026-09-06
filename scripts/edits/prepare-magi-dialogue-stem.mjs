import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Original voice recordings, no source separation, new voices or live mix changes.
if (!process.argv[2]) throw new Error('Usage: node prepare-magi-dialogue-stem.mjs <production-root>');
const root = resolve(process.argv[2]);
const out = resolve(root, 'production/award-candidate/sound');
const timeline = JSON.parse(readFileSync(resolve(root, 'production/magnific/gift-of-the-magi/full-film-v1.json')));
const files = readdirSync(resolve(root, 'public/magi-audio'));
const sources = [];
mkdirSync(out, { recursive: true });
function run(exe, args) {
  const r = spawnSync(resolve(root, 'tools/ffmpeg/bin', exe + '.exe'), args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr || exe + ' failed');
  return r.stdout;
}
let startSample = 0;
for (const unit of timeline.units) {
  const pattern = new RegExp(`^n_s${unit.unit}_(\\d+)\\.mp3$`);
  const voices = files.filter(f => pattern.test(f)).sort((a,b) => Number(a.match(pattern)[1]) - Number(b.match(pattern)[1]));
  if (!voices.length || voices.some((f,i) => Number(f.match(pattern)[1]) !== i)) throw new Error('Missing or non-contiguous narration unit ' + unit.unit);
  const filters = voices.map((_,i)=>`[${i}:a]aresample=48000,asetpts=PTS-STARTPTS[a${i}]`);
  const samples = unit.frames * 2000; // 48 kHz / 24 fps, integer sample boundary.
  filters.push(`${voices.map((_,i)=>`[a${i}]`).join('')}concat=n=${voices.length}:v=0:a=1,adelay=${Math.round(unit.narrationOffset*48000)}S:all=1,apad,atrim=end_sample=${samples}[voice]`);
  const path = resolve(out, `dialogue-s${unit.unit}.wav`);
  run('ffmpeg', ['-y','-v','error',...voices.flatMap(f=>['-i','public/magi-audio/'+f]),'-filter_complex',filters.join(';'),'-map','[voice]','-ar','48000','-ac','2','-c:a','pcm_s24le',path]);
  sources.push({ unit:unit.unit, startSample, samples, narrationOffset:unit.narrationOffset, path, voices:voices.map(file=>({file,sha256:createHash('sha256').update(readFileSync(resolve(root,'public/magi-audio',file))).digest('hex')})) });
  startSample += samples;
}
const output = resolve(out, 'magi-dialogue-v1.wav');
const deliverySamples = Math.round(timeline.deliverySeconds * 48000);
run('ffmpeg', ['-y','-v','error',...sources.flatMap(s=>['-i',s.path]),'-filter_complex',`${sources.map((_,i)=>`[${i}:a]`).join('')}concat=n=${sources.length}:v=0:a=1,apad,atrim=end_sample=${deliverySamples}[dialogue]`,'-map','[dialogue]','-ar','48000','-ac','2','-c:a','pcm_s24le',output]);
run('ffmpeg', ['-v','error','-i',output,'-f','null','-']);
writeFileSync(resolve(out,'dialogue-manifest.json'),JSON.stringify({status:'technical dialogue stem; listening and picture-sync review pending',sampleRate:48000,channels:2,bitDepth:24,deliverySamples,storySamples:startSample,sha256:createHash('sha256').update(readFileSync(output)).digest('hex'),sources},null,2)+'\n');
console.log(`Prepared original-voice stem: ${deliverySamples} samples. No public mix changed.`);
