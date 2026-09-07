"""Extract bounded pickup evidence; never admits or generates footage."""
import json
import argparse
import subprocess
from pathlib import Path
from film_audit import digest, extract, sheets, native_detail, write

BASE = Path('C:/Users/Admin/Documents/Codex/2026-09-01/le/work')
PROD = BASE/'magi-reader-solo-current/magi-reader-engine-solo-reader-redesign'
parser = argparse.ArgumentParser()
parser.add_argument('--existing', nargs='+', choices=['della-cherishes-r12', 'supper-insert-r2', 'jim-revelation-r1'])
parser.add_argument('--source', type=Path, nargs='+', help='Explicit production sources; evidence uses filename stem')
parser.add_argument('--crop', type=int, nargs=4, metavar=('X','Y','WIDTH','HEIGHT'), help='Review a mandatory static video crop in a separate evidence folder')
args = parser.parse_args()
if args.existing and args.source:
    parser.error('Choose existing names or explicit sources, not both')
names = [p.stem for p in args.source] if args.source else (args.existing or ('della-understanding', 'combs-reveal'))
for index, name in enumerate(names):
    folder = PROD/'production/award-candidate'
    source = (folder if args.existing else folder/'final-round-01')/f'{name}.mp4'
    if args.source:
        source = args.source[index].resolve(strict=True)
        if not source.is_relative_to(PROD.resolve()):
            raise SystemExit('Source must be inside the production checkout')
    evidence_name = name + ('-crop-' + '-'.join(map(str, args.crop)) if args.crop else '')
    root = BASE/'magi-film-audit-20260907/priority-batch-01'/evidence_name
    root.mkdir(parents=True, exist_ok=True)
    if (root/'state.json').exists():
        raise SystemExit('Evidence already exists; resume review, do not overwrite')
    meta = json.loads(subprocess.check_output([str(PROD/'tools/ffmpeg/bin/ffprobe.exe'), '-v','error','-select_streams','v:0','-show_entries','stream=nb_frames,r_frame_rate,width,height','-of','json',str(source)], text=True))['streams'][0]
    if meta['r_frame_rate'] != '24/1':
        raise SystemExit('Unsupported cadence; do not retime')
    count = int(meta['nb_frames'])
    state = dict(phase='extract', movie=str(source), movie_sha256=digest(source), frames=count, samples=(count+3)//4, ffmpeg=str(PROD/'tools/ffmpeg/bin/ffmpeg.exe'))
    if args.crop:
        x,y,w,h = args.crop
        if min(x,y)<0 or min(w,h)<=0 or x+w>meta['width'] or y+h>meta['height'] or w*9!=h*16:
            raise SystemExit('Crop must be an in-bounds 16:9 rectangle')
        state['mandatory_crop_xywh'] = args.crop
        state['native_detail_note'] = 'film_audit.native_detail extracts the uncropped source; do not mistake that for crop approval'
    write(root/'state.json', state)
    if args.crop:
        frames = root/'frames'
        frames.mkdir(exist_ok=True)
        subprocess.run([state['ffmpeg'], '-hide_banner','-loglevel','error','-threads','2',
            '-i',str(source),'-an','-vf',f"select='not(mod(n,4))',crop={w}:{h}:{x}:{y},scale=1280:720",
            '-fps_mode','vfr','-q:v','2','-threads','2','-filter_threads','1','-start_number','0',
            '-n',str(frames/'%06d.jpg')], check=True)
        if len(list(frames.glob('*.jpg'))) != state['samples']:
            raise SystemExit('Crop sample count mismatch')
        state['phase'] = 'film-review'
        write(root/'state.json', state)
    else:
        extract(root, state)
    result = sheets(root, list(range(state['samples'])), 'six-fps')
    write(root/'review-request.json', dict(status='awaiting-human-semantic-review', metadata=meta, sheets=result))
    print(json.dumps(result))
