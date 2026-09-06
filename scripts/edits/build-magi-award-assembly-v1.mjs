import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Consolidated review movie only. Never changes public/ or the released asset.
if (!process.argv[2]) throw new Error('Usage: node build-magi-award-assembly-v1.mjs <production-root>');
const root = resolve(process.argv[2]);
const dir = resolve(root, 'production/award-candidate');
const output = resolve(dir, 'magi-award-assembly-v1.mp4');
const inputs = [
  'public/video/films/magi-reader-film-final.mp4',
  'production/award-candidate/scene5-award-v1.mp4',
  'production/magnific/gift-of-the-magi/scene-6/raw/08-chain-and-watch.mp4',
  'production/award-candidate/scene7-award-v1.mp4',
  'production/magnific/gift-of-the-magi/scene-8/raw/01-coffee-pan.mp4',
  'production/magnific/gift-of-the-magi/scene-8/raw/02-set-table.mp4',
];
const shots = [
  { name:'Baseline opening through the two treasures', input:0, in:0, out:6869 },
  { name:'Departure and hair-sale candidate', input:1, in:0, out:1221 },
  { name:'Baseline shopping and journey home', input:0, in:8090, out:9602 },
  { name:'Della imagines his pleasure; exclude the absent watch', input:2, in:0, out:230, crop:'1472:828:0:0' },
  { name:'Preparation and self-conscious inspection candidate', input:3, in:0, out:1281 },
  { name:'Pan ready; release handle and leave the stove', input:4, in:132, out:180 },
  { name:'Finish setting the table and turn toward the door', input:5, in:30, out:204 },
  { name:'Baseline clock through closing fade and credits', input:0, in:11335, out:21387 },
];
function run(exe,args) {
  const r=spawnSync(resolve(root,'tools/ffmpeg/bin',exe+'.exe'),args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
  if(r.status!==0)throw new Error(r.stderr||exe+' failed');
  return r.stdout;
}
function probe(path) {
  return JSON.parse(run('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=r_frame_rate,nb_frames,width,height','-of','json',path])).streams[0];
}
const sources=inputs.map(path=>({path,probe:probe(path),sha256:createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex')}));
const expectedBase='1d2d36254c255723c7b34fa019371e5c0e0e35710aeef1e07b0883b80ec96ed6';
if(sources[0].sha256!==expectedBase)throw new Error('Baseline changed: rebase the edit deliberately, not by guessed frame offsets.');
let frames=0;
for(const s of shots) {
  const p=sources[s.input].probe;
  if(p.r_frame_rate!=='24/1'||Number(p.nb_frames)<s.out||s.in<0||s.in>=s.out)throw new Error('Source-range/native-frame gate failed: '+s.name);
  s.timelineStartFrame=frames;
  frames+=s.out-s.in;
  s.timelineEndFrame=frames;
}
if(frames!==21387)throw new Error('Full-film frame boundaries must remain unchanged.');
mkdirSync(dir,{recursive:true});
const filters=shots.map((s,i)=>`[${s.input}:v]trim=start_frame=${s.in}:end_frame=${s.out},setpts=PTS-STARTPTS,${s.crop?`crop=${s.crop},`:''}scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih),setsar=1,settb=AVTB[v${i}]`);
filters.push(`${shots.map((_,i)=>`[v${i}]`).join('')}concat=n=${shots.length}:v=1:a=0[picture]`);
// Copy the baseline AAC stream without re-mixing or re-encoding; compare picture alone.
run('ffmpeg',['-y','-v','error',...inputs.flatMap(p=>['-i',p]),'-filter_complex',filters.join(';'),'-map','[picture]','-map','0:a:0','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',output]);
if(Number(probe(output).nb_frames)!==frames)throw new Error('Assembly frame count changed.');
run('ffmpeg',['-v','error','-i',output,'-f','null','-']);
copyFileSync(resolve(root,'public/video/films/magi-reader-film-final.vtt'),resolve(dir,'magi-award-assembly-v1.vtt'));
writeFileSync(resolve(dir,'magi-award-assembly-v1.json'),JSON.stringify({status:'local consolidated editorial review; not festival-ready or published',fps:24,frames,pictureSeconds:frames/24,audio:'Bitstream-copy of public baseline; final mix pending',outputSha256:createHash('sha256').update(readFileSync(output)).digest('hex'),sources,shots},null,2)+'\n');
console.log(`Consolidated candidate: ${frames} frames. Public master unchanged.`);
