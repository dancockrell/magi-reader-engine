"""Build a hash-deduplicated review queue; filenames route work, never admit art."""
import argparse
import collections
import json
from pathlib import Path


def classify(paths):
    normalized = [p.replace('\\', '/').lower() for p in paths]
    # Derivatives stay reachable for provenance but are not independent raw takes.
    if all(any(t in p for t in ('assembly-v', '/baseline', '-context-', '-in-context-',
                                'scene5-award-', 'scene7-award-', '/sound/')) for p in normalized):
        return 'derived-review-export', 'Route to provenance check, not automatic source rejection.'
    if all('/quarantine/' in p for p in normalized):
        return 'quarantine', 'Keep historical rejection; inspect reason before any reconsideration.'
    joined = ' '.join(normalized)
    if any(t in joined for t in ('chain', 'combs', 'cherishes', '/scene-10/', '/scene-11/', '/scene-12/', 'supper', 'chops-offer', 'parcel', 'unwrap', 'comfort')):
        return 'priority-gifts-ending', 'Resolve persistent gifts and sacrifice before final retake list.'
    return 'remaining-story', 'Review against text-led beats and master findings.'


def build(items):
    grouped = collections.defaultdict(list)
    for item in items:
        grouped[item['sha256']].append(item)
    result = []
    for sha, members in grouped.items():
        paths = [x['path'] for x in members]
        category, reason = classify(paths)
        result.append({'sha256': sha, 'paths': paths, 'category': category,
                       'routing_reason': reason, 'visual_status': 'not_decided_by_queue',
                       'pinned_dispositions': sorted(set(x['status'] for x in members))})
    return sorted(result, key=lambda x: (x['category'], x['paths'][0]))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('inventory', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    items = json.loads(args.inventory.read_text(encoding='utf-8-sig'))
    queue = build(items)
    report = {'note': 'Routing only; no visual admission, rejection or canonical choice.',
              'path_count': len(items), 'unique_hashes': len(queue),
              'categories': dict(collections.Counter(x['category'] for x in queue)),
              'queue': queue}
    args.output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'queue'}, indent=2))
