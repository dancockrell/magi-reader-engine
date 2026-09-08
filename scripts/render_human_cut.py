"""Resource-bounded, resumable physical edit. Never pads or retimes footage.

Unselected sections remain explicitly identified baseline material, not approved
coverage. Rendered checkpoints allow finishing against a movie instead of a plan.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path


def run(args):
    subprocess.run([str(x) for x in args], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--production', type=Path, required=True)
    ap.add_argument('--plan', type=Path, required=True)
    ap.add_argument('--output', type=Path, required=True)
    ap.add_argument('--overrides', type=Path)
    args = ap.parse_args()
    root = args.production.resolve()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    ff = root / 'tools/ffmpeg/bin/ffmpeg.exe'
    probe = root / 'tools/ffmpeg/bin/ffprobe.exe'
    baseline = root / 'production/award-candidate/magi-award-assembly-v6.mp4'
    plan = json.loads(args.plan.read_text(encoding='utf-8-sig'))
    edits = []
    for shot in plan['shots']:
        start, end = shot['start'], shot['end']
        chosen = shot.get('selected_candidate') or {}
        # Intro must retain its existing titles until its separate composite is ready.
        usable = (start >= 222 and chosen.get('ledger_status') == 'admit'
                  and chosen.get('source_path')
                  and chosen.get('source_out', 0) - chosen.get('source_in', 0) == end-start)
        src = Path(chosen['source_path']) if usable else baseline
        source_in = chosen['source_in'] if usable else start
        crop = chosen.get('crop_xywh') if usable else None
        item = dict(start=start, end=end, source=str(src), source_in=source_in,
                    crop=crop, treatment='selected-replacement' if usable else 'baseline-unfinished')
        # Merge contiguous baseline portions: avoid artificial edit points and jobs.
        if (edits and item['treatment'] == 'baseline-unfinished'
                and edits[-1]['treatment'] == 'baseline-unfinished' and edits[-1]['end'] == start):
            edits[-1]['end'] = end
        else:
            edits.append(item)
    if args.overrides:
        for patch in json.loads(args.overrides.read_text(encoding='utf-8'))['edits']:
            replacement = dict(patch, source=str(root / patch['source']), treatment='human-performance-edit')
            revised = []
            for old in edits:
                if old['end'] <= patch['start'] or old['start'] >= patch['end']:
                    revised.append(old)
                    continue
                if old['start'] < patch['start']:
                    revised.append(dict(old, end=patch['start']))
                if old['end'] > patch['end']:
                    revised.append(dict(old, start=patch['end'], source_in=old['source_in']+patch['end']-old['start']))
            edits = sorted(revised+[replacement],key=lambda e:e['start'])
    assert edits[0]['start'] == 0 and edits[-1]['end'] == 21387
    assert all(a['end'] == b['start'] for a,b in zip(edits, edits[1:]))
    manifest = dict(status='rendered-checkpoint-not-final', fps=24, edits=edits)
    (out/'edit.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    pieces = []
    for i, edit in enumerate(edits):
        count = edit['end']-edit['start']
        key = hashlib.sha256(json.dumps(edit, sort_keys=True).encode()).hexdigest()[:12]
        part = out / f'{i:03}-{key}.mp4'
        pieces.append(part)
        if part.exists() and part.stat().st_size > 1024:
            info = json.loads(subprocess.check_output([str(probe), '-v','error','-select_streams','v:0',
                '-show_entries','stream=nb_frames','-of','json',str(part)]))
            if int(info['streams'][0].get('nb_frames',0)) == count:
                print(f'Cached {i+1}/{len(edits)}', flush=True)
                continue
        filters = ['setpts=PTS-STARTPTS']
        if edit['crop']:
            x,y,w,h = edit['crop']
            filters.append(f'crop={w}:{h}:{x}:{y}')
        filters += ['scale=1920:1080:force_original_aspect_ratio=decrease',
                    'pad=1920:1080:(ow-iw)/2:(oh-ih)/2', 'setsar=1', 'format=yuv420p']
        print(f'Rendering {i+1}/{len(edits)}: {edit["start"]/24:.2f}–{edit["end"]/24:.2f}', flush=True)
        run([ff,'-hide_banner','-loglevel','error','-y','-threads','2','-ss',edit['source_in']/24,
             '-i',edit['source'],'-an','-vf',','.join(filters),'-frames:v',count,
             '-c:v','libx264','-preset','fast','-crf','18','-threads','2','-filter_threads','1',
             '-fps_mode','passthrough','-video_track_timescale','12288',part])
    listing = out/'concat.txt'
    listing.write_text(''.join("file '" + p.as_posix().replace("'", "'\\''") + "'\n" for p in pieces), encoding='utf-8')
    movie = out/'magi-human-cut-checkpoint.mp4'
    run([ff,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',listing,
         '-i',baseline,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',movie])
    info = json.loads(subprocess.check_output([str(probe),'-v','error','-show_streams','-of','json',str(movie)]))
    video = next(s for s in info['streams'] if s['codec_type']=='video')
    assert int(video['nb_frames']) == 21387, video
    manifest['output'] = str(movie)
    manifest['probe'] = info
    manifest['sha256'] = hashlib.file_digest(movie.open('rb'),'sha256').hexdigest()
    (out/'edit.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(f'RENDER COMPLETE: {movie}',flush=True)


if __name__ == '__main__':
    main()
