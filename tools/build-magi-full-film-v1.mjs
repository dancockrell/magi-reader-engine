import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const ffmpeg = resolve(root, 'tools/ffmpeg/bin/ffmpeg.exe');
const ffprobe = resolve(root, 'tools/ffmpeg/bin/ffprobe.exe');
const fps = 24;
const story = [
  { unit: 1, file: 'public/video/films/magi-opening-v11-preview.mp4', frames: 1201 },
  { unit: 2, file: 'public/video/films/magi-scene2-v1-preview.mp4', frames: 1650 },
  { unit: 3, file: 'public/video/films/magi-scene3-v1-preview.mp4', frames: 2258 },
  { unit: 4, file: 'public/video/films/magi-scene4-v1-preview.mp4', frames: 1538 },
  { unit: 5, file: 'public/video/films/magi-scene5-v1-preview.mp4', frames: 1221 },
  { unit: 6, file: 'public/video/films/magi-scene6-v1-preview.mp4', frames: 1742 },
  { unit: 7, file: 'public/video/films/magi-scene7-v1-preview.mp4', frames: 1281 },
  { unit: 8, file: 'public/video/films/magi-scene8-v1-preview.mp4', frames: 2043 },
  { unit: 9, file: 'public/video/films/magi-scene9-v1-preview.mp4', frames: 2882 },
  { unit: 10, file: 'public/video/films/magi-scene10-v1-preview.mp4', frames: 2242 },
  { unit: 11, file: 'public/video/films/magi-scene11-v1-preview.mp4', frames: 1266 },
  { unit: 12, file: 'public/video/films/magi-scene12-v1-preview.mp4', frames: 1265 },
];
const credits = 'production/magnific/gift-of-the-magi/credits-v1-48k.mp4';
const output = 'public/video/films/magi-reader-film-final.mp4';
const vtt = 'public/video/films/magi-reader-film-final.vtt';
const report = 'production/magnific/gift-of-the-magi/full-film-v1.json';

function run(binary, args) {
  const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || 'Media command failed');
  return result.stdout;
}
function probe(path) { return JSON.parse(run(ffprobe, ['-v','error','-show_entries','stream=codec_name,width,height,r_frame_rate,sample_rate,channels','-show_entries','format=duration','-of','json',path])); }

mkdirSync(resolve(root, 'production/magnific/gift-of-the-magi'), { recursive: true });
run(ffmpeg, ['-y','-v','error','-i','public/video/films/magi-credits-v1.mp4','-map','0:v','-map','0:a','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',credits]);

for (const scene of story) {
  const p = probe(scene.file); const v = p.streams[0]; const a = p.streams[1];
  if (v.codec_name !== 'h264' || v.width !== 1920 || v.height !== 1080 || v.r_frame_rate !== '24/1' || a.codec_name !== 'aac' || a.sample_rate !== '48000' || a.channels !== 2) throw new Error(`Delivery gate failed: ${scene.file}`);
}
const creditProbe = probe(credits); if (creditProbe.streams[1].sample_rate !== '48000') throw new Error('Credits audio normalization failed');

const concatPath = resolve(root, 'production/magnific/gift-of-the-magi/full-film-v1-concat.txt');
const all = [...story.map((scene) => scene.file), credits];
writeFileSync(concatPath, all.map((path) => `file '${resolve(root, path).replaceAll("'", "'\\''")}'`).join('\n') + '\n');
run(ffmpeg, ['-y','-v','error','-f','concat','-safe','0','-i',concatPath,'-c','copy','-movflags','+faststart',output]);

const book = JSON.parse(readFileSync(resolve(root, 'src/books/magi/book.json'), 'utf8'));
const stamp = (seconds) => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
let sceneStart = 0; const cues = []; const unitReports = [];
for (const scene of story) {
  const unit = book.units[scene.unit - 1];
  const lines = unit.stanzas.join('\n').split('\n').map((line) => line.replace(/\{([^|}]+)\|[^}]+\}/g, '$1'));
  let voiceTime = 0;
  lines.forEach((line, i) => {
    const voice = `public/magi-audio/n_s${scene.unit}_${i}.mp3`;
    const length = Number(run(ffprobe, ['-v','error','-show_entries','format=duration','-of','default=nokey=1:noprint_wrappers=1',voice]).trim());
    const start = sceneStart + voiceTime; voiceTime += length;
    cues.push(`${stamp(start)} --> ${stamp(sceneStart + voiceTime)}\n${line}\n`);
  });
  unitReports.push({ unit: scene.unit, frames: scene.frames, pictureSeconds: scene.frames / fps, narrationSeconds: voiceTime, driftSeconds: scene.frames / fps - voiceTime });
  sceneStart += scene.frames / fps;
}
writeFileSync(resolve(root, vtt), 'WEBVTT\n\n' + cues.join('\n'));
const finalProbe = probe(output);
writeFileSync(resolve(root, report), JSON.stringify({
  schema: 1,
  date: '2026-09-06',
  rules: ['Native 24 fps picture throughout', 'No holds, loops, reversals, interpolation, or speed fitting', 'Continuous authored movie; reader logic does not control picture timing'],
  storyFrames: story.reduce((sum, scene) => sum + scene.frames, 0),
  storySeconds: sceneStart,
  creditsSeconds: Number(creditProbe.format.duration),
  deliverySeconds: Number(finalProbe.format.duration),
  units: unitReports,
  output,
  captions: vtt,
}, null, 2) + '\n');
console.log(`Full film baked: ${sceneStart.toFixed(3)} story seconds + ${Number(creditProbe.format.duration).toFixed(3)} credits = ${Number(finalProbe.format.duration).toFixed(3)} seconds.`);
