import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
if(!process.argv[2])throw Error('Usage: node build-closing-sound-audition-r1.mjs <production-root>');
const root=resolve(process.argv[2]), dir=resolve(root,'production/award-candidate'), sound=resolve(dir,'sound');
const film=resolve(dir,'magi-award-assembly-v6.mp4'), voice=resolve(sound,'magi-dialogue-v1.wav'), music=resolve(sound,'closing-recognition-r1.mp3');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const inputs=[
 [film,'852574ecb47757dd45b3d56293ec05b6af0547efcdbd5257b71e083997b3ef3b'],
 [voice,'ef4a105069cd26800f1631d97731fcc55006ad14673824151ec647daa4652d78'],
 [music,'59933a82a620e3435fd41bfc2007d893d65f8e6ef7bd523174e390533a88d753'],
];
for(const [p,h] of inputs)if(hash(p)!==h)throw Error('Reviewed source changed: '+p);
const startFrame=18913,start=startFrame/24,end=891.156,samples=Math.round((end-start)*48000),voiceDelaySamples=1264;
const cueStart=811.5,cueDelay=Math.round((cueStart-start)*48000),credits=867.125-start;
const output=resolve(sound,'closing-sound-audition-r1.mp4');
if(existsSync(output))throw Error('Completed audition exists; do not overwrite.');
const run=(exe,args)=>{const r=spawnSync(resolve(root,'tools/ffmpeg/bin',exe+'.exe'),args,{encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw Error(r.stderr||exe+' failed');return r.stdout;};
const ff=args=>run('ffmpeg',['-y','-v','error','-threads','2','-filter_complex_threads','1',...args]);
const voiceOut=resolve(sound,'closing-dialogue-r1.wav'),scoreOut=resolve(sound,'closing-score-r1.wav'),mixOut=resolve(sound,'closing-mix-r1.wav');
ff(['-i',voice,'-af',`adelay=${voiceDelaySamples}S:all=1,atrim=start_sample=${startFrame*2000}:end_sample=${startFrame*2000+samples},asetpts=PTS-STARTPTS,apad,atrim=end_sample=${samples}`,'-ar','48000','-ac','2','-c:a','pcm_s24le',voiceOut]);
// Whole generated cue: no phrase chopping, looping or tempo changes. Gain is provisional.
ff(['-i',music,'-af',`aresample=48000,adelay=${cueDelay}S:all=1,apad,atrim=end_sample=${samples},volume='if(lt(t,${credits}),0.07,if(lt(t,${credits+3}),0.07+0.07*(t-${credits})/3,0.14))':eval=frame,afade=t=in:st=${cueStart-start}:d=2,afade=t=out:st=${end-start-3}:d=3`,'-ar','48000','-ac','2','-c:a','pcm_s24le',scoreOut]);
ff(['-i',voiceOut,'-i',scoreOut,'-filter_complex','[0:a][1:a]amix=inputs=2:duration=first:normalize=0[mix]','-map','[mix]','-ar','48000','-ac','2','-c:a','pcm_s24le',mixOut]);
// Start is a verified existing H.264 keyframe; copy picture instead of rendering.
ff(['-ss',String(start),'-i',film,'-i',mixOut,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-t',String(end-start),'-movflags','+faststart',output]);
ff(['-ss',String(start),'-i',film,'-map','0:v:0','-map','0:a:0','-c','copy','-t',String(end-start),'-movflags','+faststart',resolve(sound,'closing-original-v6.mp4')]);
const measures={};
for(const [name,p] of [['original',resolve(sound,'closing-original-v6.mp4')],['audition',output]]){
 const r=spawnSync(resolve(root,'tools/ffmpeg/bin/ffmpeg.exe'),['-hide_banner','-threads','2','-i',p,'-vn','-af','ebur128=peak=true','-f','null','-'],{encoding:'utf8',maxBuffer:4*1024*1024});
 if(r.status!==0)throw Error(r.stderr);measures[name]=r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
}
ff(['-i',output,'-f','null','-']);
const probe=JSON.parse(run('ffprobe',['-v','error','-show_entries','stream=codec_type,start_time,duration,nb_frames,sample_rate,channels:format=duration','-of','json',output]));
writeFileSync(resolve(sound,'closing-sound-audition-r1.json'),JSON.stringify({status:'audition only; musical phrasing and sound-on picture review required; not admitted or published',startFrame,startSeconds:start,endSeconds:end,cueStartSeconds:cueStart,voiceDelaySamples,sampleRate:48000,samples,picture:'copy of v6 from verified keyframe; no new video encoding',inputs:inputs.map(([path,sha256])=>({path,sha256})),outputSha256:hash(output),probe,measures},null,2)+'\n');
console.log('Separate closing audition and original comparison saved. No full film or public audio replaced.');
