import { createReadStream, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Production root required');
const dir = resolve(root, 'production/award-candidate');
const fullTakeTest = process.argv[3] === '--full-take-test';
const name = fullTakeTest ? 'jim-continuity-context-r7' : 'jim-continuity-context-r7b';
const output = resolve(dir, `${name}.mp4`);
if (existsSync(output)) throw new Error('Do not overwrite an existing review cut');
const base = resolve(dir, 'magi-award-assembly-v6.mp4');
const take = resolve(dir, 'jim-continuation-r7.mp4');
async function hash(file) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}
const baseHash = await hash(base);
if (baseHash !== '852574ecb47757dd45b3d56293ec05b6af0547efcdbd5257b71e083997b3ef3b') throw new Error('Baseline changed');
const takeHash = await hash(take);
if (takeHash !== '602eabf5d13fc24abbbb658447b21e9886a428ccf2f77ce05b0a6ccc20c02d48') throw new Error('Reviewed take changed');
function run(exe, args) {
  const result = spawnSync(resolve(root, `tools/ffmpeg/bin/${exe}.exe`), args,
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || `${exe} failed`);
  return result.stdout;
}
const probe = file => JSON.parse(run('ffprobe', ['-v','error','-select_streams','v:0',
  '-show_entries','stream=width,height,r_frame_rate,nb_frames','-of','json',file])).streams[0];
const p = probe(take);
if (p.r_frame_rate !== '24/1' || Number(p.nb_frames) < 241) throw new Error('Take must provide 241 native 24fps frames; do not stretch');
const filter = [
  fullTakeTest ? '[0:v]split=4[b0][b1][b2][b3]' : '[0:v]split=5[b0][b1][b2][b3][b4]',
  '[b0]trim=start_frame=0:end_frame=144,setpts=PTS-STARTPTS,setsar=1,settb=AVTB[v0]',
  '[b1]trim=start_frame=144:end_frame=240,setpts=PTS-STARTPTS,crop=1024:576:896:0,scale=1920:1080:flags=lanczos,setsar=1,settb=AVTB[v1]',
  '[b2]trim=start_frame=240:end_frame=480,setpts=PTS-STARTPTS,setsar=1,settb=AVTB[v2]',
  `[1:v]trim=start_frame=1:end_frame=${fullTakeTest?241:105},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih),setsar=1,settb=AVTB[v3]`,
  ...(!fullTakeTest ? ['[b4]trim=start_frame=584:end_frame=720,setpts=PTS-STARTPTS,crop=1024:576:896:0,scale=1920:1080:flags=lanczos,setsar=1,settb=AVTB[v5]'] : []),
  '[b3]trim=start_frame=720:end_frame=960,setpts=PTS-STARTPTS,setsar=1,settb=AVTB[v4]',
  fullTakeTest ? '[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[v]' : '[v0][v1][v2][v3][v5][v4]concat=n=6:v=1:a=0[v]',
  '[0:a]atrim=start=0:end=40,asetpts=PTS-STARTPTS[a]',
].join(';');
const temp = resolve(dir, `${name}.rendering.mp4`);
run('ffmpeg', ['-v','error','-y','-threads','2','-ss',String(13780/24),'-i',base,
  '-threads','2','-i',take,'-filter_complex_threads','1','-filter_complex',filter,
  '-map','[v]','-map','[a]','-c:v','libx264','-threads','2','-preset','fast','-crf','17',
  '-pix_fmt','yuv420p','-video_track_timescale','12288','-c:a','aac','-b:a','192k',
  '-movflags','+faststart',temp]);
if (Number(probe(temp).nb_frames) !== 960) throw new Error('Context frame count changed');
run('ffmpeg',['-v','error','-threads','2','-i',temp,'-f','null','-']);
renameSync(temp,output);
const timestamp = value => new Date(Math.round(value*1000)).toISOString().slice(11,23);
const seconds = value => value.split(':').reduce((sum,part)=>sum*60+Number(part),0);
const cues = readFileSync(resolve(dir,'magi-award-assembly-v6.vtt'),'utf8').split(/\r?\n\r?\n/).flatMap(block=>{
  const lines=block.split(/\r?\n/), match=lines[0]?.match(/([\d:.]+) --> ([\d:.]+)/);
  if(!match) return [];
  const start=seconds(match[1])-13780/24,end=seconds(match[2])-13780/24;
  if(end<=0||start>=40) return [];
  return [`${timestamp(Math.max(0,start))} --> ${timestamp(Math.min(40,end))}\n${lines.slice(1).join('\n')}`];
});
writeFileSync(resolve(dir,`${name}.vtt`),'WEBVTT\n\n'+cues.join('\n\n')+'\n');
writeFileSync(resolve(dir,`${name}.json`),JSON.stringify({
  status:'local context audition, requires visual admission; not a new full master',
  baseline:'magi-award-assembly-v6.mp4',baselineHash:baseHash,
  baselineStartFrame:13780,frames:960,fps:24,
  take:'jim-continuation-r7.mp4',takeHash,creation:'3zMaP2bREY',credits:950,
  sourceRange:[1,fullTakeTest?241:105],reason:fullTakeTest?'Full-take test; rejected for later costume drift':'Skip reference-start frame; cut on Della foreground crossing before later costume drift',
  precedingReframe:{baselineRange:[13924,14020],crop:'1024:576:896:0'},
  replacementBaselineRange:[14260,14500],
  returnedReaction:fullTakeTest?null:{baselineRange:[14364,14500],crop:'1024:576:896:0'},
  audio:'Unchanged mix, trimmed and AAC re-encoded for context only',
  outputHash:await hash(output),
},null,2)+'\n');
console.log('40-second context baked and decoded. Screening v6 and public film untouched.');
