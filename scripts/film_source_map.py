"""Resolve nested, hash-pinned EDLs into source ranges. Never admits or renders art."""
import argparse
import json
from pathlib import Path
from film_audit import digest, read, write


def frame(seconds, fps):
    value = seconds * fps
    if abs(value - round(value)) > .0001:
        raise ValueError('Non-native timeline boundary')
    return round(value)


def normalize(edl):
    fps = edl['fps']
    if fps != 24:
        raise ValueError('Only native24 EDLs supported here; never retime silently')
    cursor, result = 0, []
    for shot in edl['shots']:
        if 'input' in shot:
            source = edl['sources'][shot['input']]
        elif 'file' in shot:
            matches = [s for s in edl['sources'] if s.get('file') == shot['file']]
            if len(matches) != 1:
                raise ValueError('Ambiguous file source')
            source = matches[0]
        else:
            source = shot
        start = shot.get('timelineStartFrame')
        end = shot.get('timelineEndFrame')
        if start is None: start = frame(shot['timelineStart'], fps)
        if end is None: end = frame(shot['timelineEnd'], fps)
        a = shot.get('in', shot.get('start'))
        b = shot.get('out', shot.get('end'))
        if any(type(v) is not int for v in (start, end, a, b)):
            raise ValueError('Integer native bounds required')
        if start != cursor or end <= start or a < 0 or b-a != end-start:
            raise ValueError('EDL gap, overlap, reversal or duration fitting')
        if not source.get('sha256'):
            raise ValueError('Unpinned source; cannot infer identity from filename')
        result.append({'start': start, 'end': end, 'in': a, 'out': b,
                       'sha256': source['sha256'],
                       'label': shot.get('name', shot.get('reason', '')),
                       'crop': shot.get('crop')})
        cursor = end
    if cursor != edl['frames']:
        raise ValueError('EDL does not cover declared frames')
    return result


def resolve(sha, start, end, timeline, registry, chain=()):
    if sha in chain:
        raise ValueError('Cyclic EDL provenance')
    if sha not in registry:
        return [{'source_sha256': sha, 'source_in': start, 'source_out': end,
                 'timeline_start': timeline, 'timeline_end': timeline+end-start,
                 'crop_pipeline': [], 'provenance': []}]
    edl, label = registry[sha]
    if not (0 <= start < end <= edl['frames']):
        raise ValueError('Nested source range exceeds its EDL')
    result = []
    for shot in normalize(edl):
        lo, hi = max(start, shot['start']), min(end, shot['end'])
        if hi <= lo: continue
        a = shot['in'] + lo-shot['start']
        leaves = resolve(shot['sha256'], a, a+hi-lo, timeline+lo-start,
                         registry, (*chain, sha))
        for leaf in leaves:
            if shot['crop']:
                leaf['crop_pipeline'].append({'crop_whxy': shot['crop'],
                                             'then_scale': [1920,1080], 'edl': label})
            leaf['provenance'].append({'edl': label, 'shot': shot['label']})
        result.extend(leaves)
    return result


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--bindings', required=True, type=Path)
    p.add_argument('--inventory', required=True, type=Path)
    p.add_argument('--output', required=True, type=Path)
    args = p.parse_args()
    bindings = read(args.bindings)
    registry, verified = {}, {}
    inventory = read(args.inventory) + bindings.get('additional_files', [])
    def verify(sha):
        if sha in verified: return
        paths = [Path(x['path']) for x in inventory if x['sha256'] == sha]
        if not paths or digest(paths[0]) != sha:
            raise ValueError(f'Missing/changed inventory bytes: {sha}')
        verified[sha] = str(paths[0].resolve())
    for item in bindings['edls']:
        sha = item['output_sha256']
        verify(sha)
        path = Path(item['edl'])
        edl = read(path)
        if edl.get('outputSha256', sha) != sha:
            raise ValueError('EDL output binding mismatch')
        registry[sha] = (edl, str(path))
    master = bindings['master_sha256']
    shots = resolve(master, 0, registry[master][0]['frames'], 0, registry)
    for shot in shots:
        verify(shot['source_sha256'])
        shot['source_path'] = verified[shot['source_sha256']]
        shot['status'] = 'provenance-only-not-admitted'
    write(args.output, {'master_sha256': master,
          'status': 'source-map-not-a-final-edit-plan',
          'warning': 'Unexpanded composites remain opaque. No artistic approval inferred.',
          'verified_sources': verified, 'shots': shots})
    print(json.dumps({'mapped_ranges': len(shots), 'verified_files': len(verified),
                      'seconds': sum(x['timeline_end']-x['timeline_start'] for x in shots)/24}))


if __name__ == '__main__': main()
