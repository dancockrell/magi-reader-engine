"""Carry the completed visual audit into a text-led editing workboard.

No artistic decisions are manufactured: audit intervals are not asserted to be
true cut boundaries, and candidates remain unadmitted. This is not render input.
"""
import argparse
import json
from pathlib import Path


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def build(state, beats, receipts):
    sha = state['movie_sha256']
    if state['phase'] != 'inventory-review-required':
        raise ValueError('Complete the whole-film review first')
    cursor = 0
    intervals = []
    for name, receipt in sorted(receipts, key=lambda pair: pair[1]['sample_start']):
        if receipt['movie_sha256'] != sha:
            raise ValueError('Receipt belongs to another film')
        if receipt['sample_start'] != cursor or receipt['sample_end'] <= cursor:
            raise ValueError('Review receipts have a gap or overlap')
        cursor = receipt['sample_end']
        for index, shot in enumerate(receipt['shots']):
            if shot['end'] <= shot['start']:
                raise ValueError('Invalid observed interval')
            intervals.append({
                'evidence': f'{name}:shots[{index}]',
                'start_seconds': shot['start'], 'end_seconds': shot['end'],
                'observed': shot['observed'],
                'audit_decision': shot['decision'], 'reason': shot['reason'],
                'escalations': [e for e in receipt.get('escalations', [])
                                if e['seconds'][0] < shot['end'] and
                                e['seconds'][1] > shot['start']],
            })
    if cursor != state['samples']:
        raise ValueError('Review does not cover all sampled frames')
    result = []
    for beat in beats:
        evidence = [i for i in intervals if i['start_seconds'] < beat['end']
                    and i['end_seconds'] > beat['start']]
        if not evidence:
            raise ValueError(f"No review evidence for {beat['id']}")
        result.append({
            **beat, 'review_intervals': evidence,
            'editing_status': 'needs_source_selection_and_exact_cut_design',
            'final_shots': [],
        })
    return {
        'schema_version': 1, 'status': 'editing_workboard_not_renderable',
        'movie_sha256': sha,
        'warning': 'Intervals include review packet and story boundaries, not only cuts. '
                   'Audit decisions and source candidates do not constitute admission.',
        'sample_coverage': cursor, 'beat_count': len(result),
        'review_interval_count': len(intervals), 'beats': result,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--audit', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    receipts = [(p.name, read(p)) for p in (args.audit / 'reviews').glob('*.json')]
    board = build(read(args.audit / 'state.json'),
                  read(args.audit / 'storyboard-resolved.json'), receipts)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(board, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in board.items() if k != 'beats'}, indent=2))


if __name__ == '__main__':
    main()
