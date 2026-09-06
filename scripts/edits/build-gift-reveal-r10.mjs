import {createReadStream, existsSync, readFileSync, writeFileSync, renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

// Authored native-frame edit, not a sentence-driven playback mechanism.
// This excerpt stops before the still-unrepaired comforting coverage.
if (!process.argv[2]) throw new Error('Supply the production root');
const root=resolve(process.argv[2]), dir=resolve(root,'production/award-candidate');
const mode=process.argv[3]??'r10';
if(!['r10','comfort-r11','combs-r12'].includes(mode))throw new Error('Unknown edit mode');
const combs=mode==='combs-r12',comfort=mode!=='r10';
const name=combs?'gift-reveal-context-r12':comfort?'gift-reveal-context-r11':'gift-reveal-context-r10', output=resolve(dir,name+'.mp4');
if(existsSync(output)) throw new Error('Preserve the existing reviewed render');
const base=resolve(dir,'magi-award-assembly-v6.mp4');
const sources=[
 ['parcel-toss-r8b.mp4','7fbab1987d12cc62d1bbac24ceeefef196ff773115626cc75af21e2eaca5162b',1916],
 ['parcel-insert-r9.mp4','6ce86f7864ee1d26c2e8001242b4ebcabf6eea329a9c71a58e4b0c1f88159479',1916],
 ['parcel-reassurance-r8.mp4','c2d7c32de87c364c72ab9d41cb7846d2062514ca244ddc2a67a406c16b7187bd',1920],
 ['../magnific/gift-of-the-magi/scene-10/raw/02-reassurance.mp4','40a9eba1de3685e1b0d0405087fc6bc4631d4d7cf7685c6a6f72ed0ec388b6e6',1920],
 ['unwrap-r10.mp4','826fa477b9a6b1b56501a63534fb25b8b1dee74510cd5400659624770a9de63e',1916],
 ['reaction-r10.mp4','8c1a9049d6186873090b0b9b496aa53dfe3bf03a9e09a314ea661ca55564c5d3',1916],
];
if(comfort)sources.push(['comfort-r11.mp4','3841beb55099a884aecf2908497f3af4b71192b3f385a430f362ec7685343e8a',1916]);
if(combs)sources.push(['combs-insert-r12.mp4','bf0a3838760cf93a3ccc6c1194b2480d206839911b2c78bf664368be09ce4dc3',1916]);
async function hash(file){const h=createHash('sha256');for await(const c of createReadStream(file)) h.update(c);return h.digest('hex');}
function run(exe,args){const r=spawnSync(resolve(root,'tools/ffmpeg/bin/'+exe+'.exe'),args,{encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});if(r.status!==0)throw new Error(r.stderr);return r.stdout;}
const probe=file=>JSON.parse(run('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_frames','-of','json',file])).streams[0];
const baseHash=await hash(base);
if(baseHash!=='852574ecb47757dd45b3d56293ec05b6af0547efcdbd5257b71e083997b3ef3b')throw new Error('Baseline changed');
for(const [file,sha,width] of sources){
 const full=resolve(dir,file),p=probe(full);
 if(await hash(full)!==sha || p.width!==width || p.height!==1080 || p.r_frame_rate!=='24/1')throw new Error('Inspected source changed: '+file);
}
const pad='pad=1920:1080:2:0';
const faces='crop=1536:864:192:0,scale=1920:1080:flags=lanczos';
const jim='crop=1152:648:768:0,scale=1920:1080:flags=lanczos';
const edits=[
 {input:0,range:[0,96],frame:'null',note:'Previous shot'},
 {input:1,range:[24,78],frame:pad,note:'Pocket only; reject malformed later parcel'},
 {input:2,range:[36,90],frame:pad,note:'Actual release'},
 {input:3,range:[0,96],frame:faces,note:'First reassurance response; mandatory crop'},
 {input:4,range:[48,240],frame:jim,note:'Jim close view; mandatory crop excludes handheld parcel'},
 {input:3,range:[108,240],frame:faces,note:'Della anticipates opening; unused12 frames omitted across coverage'},
 {input:5,range:[12,180],frame:pad,note:'Continuous string/paper opening; stop before idle case tail'},
 {input:6,range:[0,240],frame:pad,note:'Delight becomes tears; look to Jim'},
];
if(comfort)edits.push({input:7,range:[1,145],frame:pad,note:'Matching standing comfort; omit duplicate anchor frame, six native seconds'});
if(combs)edits.push({input:8,range:[72,192],frame:pad,note:'Five-second moving comb reveal; discard nearly static opening'});
for(const e of edits)if(e.input && Number(probe(resolve(dir,sources[e.input-1][0])).nb_frames)<e.range[1])throw new Error('Range exceeds source');
const start=664.25,frames=edits.reduce((n,e)=>n+e.range[1]-e.range[0],0),duration=frames/24;
if(frames!==(combs?1296:comfort?1176:1032))throw new Error('Edit timing changed');
const filters=edits.map((e,i)=>'['+e.input+':v]trim=start_frame='+e.range[0]+':end_frame='+e.range[1]+',setpts=PTS-STARTPTS,'+e.frame+',setsar=1,settb=AVTB[v'+i+']');
filters.push(edits.map((_,i)=>'[v'+i+']').join('')+'concat=n='+edits.length+':v=1:a=0[v]');
filters.push('[0:a]atrim=start=0:end='+duration+',asetpts=PTS-STARTPTS[a]');
const temp=resolve(dir,name+'.rendering.mp4');
run('ffmpeg',['-v','error','-n','-threads','2','-ss',String(start),'-i',base,...sources.flatMap(([file])=>['-threads','2','-i',resolve(dir,file)]),
 '-filter_complex_threads','1','-filter_complex',filters.join(';'),'-map','[v]','-map','[a]',
 '-c:v','libx264','-threads','2','-preset','fast','-crf','17','-pix_fmt','yuv420p','-video_track_timescale','12288',
 '-c:a','aac','-b:a','192k','-movflags','+faststart',temp]);
if(Number(probe(temp).nb_frames)!==frames)throw new Error('Unexpected rendered count');
run('ffmpeg',['-v','error','-threads','2','-i',temp,'-threads','2','-f','null','-']);
renameSync(temp,output);
const stamp=n=>new Date(Math.round(n*1000)).toISOString().slice(11,23);
const secs=s=>s.split(':').reduce((n,v)=>n*60+Number(v),0);
const cues=readFileSync(resolve(dir,'magi-award-assembly-v6.vtt'),'utf8').split(/\r?\n\r?\n/).flatMap(block=>{
 const lines=block.split(/\r?\n/),m=lines[0]?.match(/([\d:.]+) --> ([\d:.]+)/);
 if(!m)return[];const a=secs(m[1])-start,b=secs(m[2])-start;
 return b<=0||a>=duration?[]:[stamp(Math.max(0,a))+' --> '+stamp(Math.min(duration,b))+'\n'+lines.slice(1).join('\n')];
});
writeFileSync(resolve(dir,name+'.vtt'),'WEBVTT\n\n'+cues.join('\n\n')+'\n');
writeFileSync(resolve(dir,name+'.json'),JSON.stringify({status:comfort?'Local comfort audition; comb reveal and remaining scene pending':'Local reviewed-range audition; comforting and remaining reveal still pending',baselineHash:baseHash,start,frames,fps:24,sources,edits,audio:'Original v6 mix excerpted and AAC re-encoded, no narrator retake',outputHash:await hash(output)},null,2)+'\n');
console.log(duration+'-second native-frame reveal excerpt baked and decoded; screening and public master unchanged.');
