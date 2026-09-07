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
args = parser.parse_args()
for name in (args.existing or ('della-understanding', 'combs-reveal')):
    folder = PROD/'production/award-candidate'
    source = (folder if args.existing else folder/'final-round-01')/f'{name}.mp4'
    root = BASE/'magi-film-audit-20260907/priority-batch-01'/name
    root.mkdir(parents=True, exist_ok=True)
    if (root/'state.json').exists():
        raise SystemExit('Evidence already exists; resume review, do not overwrite')
    meta = json.loads(subprocess.check_output([str(PROD/'tools/ffmpeg/bin/ffprobe.exe'), '-v','error','-select_streams','v:0','-show_entries','stream=nb_frames,r_frame_rate,width,height','-of','json',str(source)], text=True))['streams'][0]
    if meta['r_frame_rate'] != '24/1':
        raise SystemExit('Unsupported cadence; do not retime')
    count = int(meta['nb_frames'])
    state = dict(phase='extract', movie=str(source), movie_sha256=digest(source), frames=count, samples=(count+3)//4, ffmpeg=str(PROD/'tools/ffmpeg/bin/ffmpeg.exe'))
    write(root/'state.json', state)
    extract(root, state)
    result = sheets(root, list(range(state['samples'])), 'six-fps')
    write(root/'review-request.json', dict(status='awaiting-human-semantic-review', metadata=meta, sheets=result))
    print(json.dumps(result))
