import {createReadStream,existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
if(!process.argv[2])throw Error('Supply production root');
const root=resolve(process.argv[2]),dir=resolve(root,'production/award-candidate');
const output=resolve(dir,'chain-context-r14.mp4');
if(existsSync(output))throw Error('Preserve existing audition');
const entries=[
 ['magi-award-assembly-v6.mp4','852574ecb47757dd45b3d56293ec05b6af0547efcdbd5257b71e083997b3ef3b'],
 ['della-chain-only-r13.mp4','bdf5093956be17f63f708038a7fd216c83f74115712d27a9622aaff7e1f44d31'],
 ['../magnific/gift-of-the-magi/scene-11/raw/02-chain-macro.mp4','6ef3d5bb5339449736905fc90ed75e828df63c9eba84293cd401bd7b04eb2fdb'],
];
async function hash(path){const h=createHash('sha256');for await(const c of createReadStream(path))h.update(c);return h.digest('hex');}
function run(exe,args){const r=spawnSync(resolve(root,'tools/ffmpeg/bin',exe+'.exe'),args,{encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});if(r.status!==0)throw Error(r.stderr);return r.stdout;}
const probe=path=>JSON.parse(run('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_frames','-of','json',path])).streams[0];
for(const [file,sha]of entries){const path=resolve(dir,file);if(await hash(path)!==sha)throw Error('Source changed: '+file);if(probe(path).r_frame_rate!=='24/1')throw Error('Not native24');}
const crop='crop=1792:1008:0:0,scale=1920:1080:flags=lanczos';
const edits=[
 {input:0,start:18184,end:18280,filter:'null',reason:'Four seconds of actual previous shot, unresolved props retained for honest contextual review'},
 {input:1,start:0,end:84,filter:crop,reason:'Della admires gift before open-palm narration'},
 {input:2,start:0,end:230,filter:'null',reason:'Open palm during script description; chain design continuity remains review gate'},
 {input:1,start:84,end:192,filter:crop,reason:'Unused later performance as she addresses Jim; no source repetition'},
 {input:0,start:18702,end:18798,filter:'null',reason:'Four seconds of actual following bare-handed exchange'},
];
let frames=0;
for(const e of edits){if(e.start<0||e.end<=e.start||e.end>Number(probe(resolve(dir,entries[e.input][0])).nb_frames))throw Error('Bounds');e.timelineStartFrame=frames;frames+=e.end-e.start;}
if(frames!==614)throw Error('Context duration mismatch');
for(let i=0;i<edits.length;i++)for(let j=i+1;j<edits.length;j++){const a=edits[i],b=edits[j];if(a.input===b.input&&Math.max(a.start,b.start)<Math.min(a.end,b.end))throw Error('Repeated source frames');}
const filters=edits.map((e,i)=>`[${e.input}:v]trim=start_frame=${e.start}:end_frame=${e.end},setpts=PTS-STARTPTS,${e.filter},setsar=1,settb=AVTB[v${i}]`);
filters.push(edits.map((_,i)=>`[v${i}]`).join('')+`concat=n=${edits.length}:v=1:a=0[v]`);
const start=18184/24,end=(18184+frames)/24;
filters.push(`[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a]`);
const temp=output.replace('.mp4','.rendering.mp4');
run('ffmpeg',['-y','-v','error',...entries.flatMap(([file])=>['-threads','2','-i',resolve(dir,file)]),'-filter_complex_threads','1','-filter_complex',filters.join(';'),'-map','[v]','-map','[a]','-c:v','libx264','-threads','2','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',temp]);
if(Number(probe(temp).nb_frames)!==frames)throw Error('Output frame count');
run('ffmpeg',['-v','error','-threads','2','-i',temp,'-f','null','-']);renameSync(temp,output);
const time=s=>{const ms=Math.round(s*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;};
const seconds=t=>t.split(':').reduce((a,x)=>a*60+Number(x),0);
const cues=readFileSync(resolve(dir,'magi-award-assembly-v6.vtt'),'utf8').split(/\r?\n\r?\n/).flatMap(block=>{const m=block.match(/(\d\d:\d\d:\d\d\.\d+) --> (\d\d:\d\d:\d\d\.\d+)\r?\n([\s\S]*)/);if(!m)return [];const a=seconds(m[1]),b=seconds(m[2]);return b>start&&a<end?[`${time(Math.max(a,start)-start)} --> ${time(Math.min(b,end)-start)}\n${m[3]}`]:[];});
writeFileSync(output.replace('.mp4','.vtt'),'WEBVTT\n\n'+cues.join('\n\n')+'\n');
writeFileSync(output.replace('.mp4','.json'),JSON.stringify({status:'Context audition only; joins and chain design not finally admitted',baselineStartFrame:18184,frames,fps:24,entries,edits,audio:'Original v6 mix excerpt; no voice replacement',sha256:await hash(output)},null,2));
console.log(JSON.stringify({output,frames,duration:frames/24}));
