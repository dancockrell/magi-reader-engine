"""Consolidate human editorial decisions, evidence and source candidates.

This is deliberately NOT renderer input. Historic cut metadata provides provisional
cut locations, not source admission. Gaps must remain gaps until actually resolved.
"""
import argparse
import json
from pathlib import Path
from film_source_map import normalize, resolve


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write(path, data):
    Path(path).write_text(json.dumps(data, indent=2)+'\n', encoding='utf-8')


def validate(plan):
    cursor = 0
    for shot in plan['shots']:
        if shot['start'] != cursor or shot['end'] <= cursor:
            raise ValueError('Plan timeline gap/overlap')
        if not shot['beats'] or not shot['tasks'] or not shot['treatment']:
            raise ValueError('Unplanned interval')
        choice = shot.get('selected_candidate')
        if choice and choice.get('source_sha256'):
            if choice['source_out']-choice['source_in'] != shot['end']-shot['start']:
                raise ValueError('Candidate would require retiming')
        cursor = shot['end']
    if cursor != plan['frames']:
        raise ValueError('Incomplete film')
    if set(b for s in plan['shots'] for b in s['beats']) != set(plan['beat_decisions']):
        raise ValueError('Unrepresented story beat')


def component_ranges(component, production):
    """Declared cut boundaries only; never label old unpinned metadata verified."""
    name = component['name']
    base = production/'production/magnific/gift-of-the-magi'
    if 'opening-v17' in name:
        metadata = base/'opening-v17-edit.json'
        shots = read(metadata)['shots']
        result = [{'start': 0, 'end': 222, 'name': 'Book and title composite',
                   'metadata': str(metadata), 'path': None}]
        shift = 0
    elif name.startswith('magi-scene2-'):
        metadata = base/'opening-v9-edit.json'
        shots = read(metadata)['shots']
        result, shift = [], -1201
    elif name.startswith('magi-scene'):
        unit = int(name.split('scene')[1].split('-')[0])
        metadata = base/f'scene-{unit}/edit-v1.json'
        shots = read(metadata)['shots']
        result, shift = [], 0
    else:
        return [{'start': 0, 'end': component['out'], 'name': 'Credits composite',
                 'metadata': None, 'path': None}]
    for index, shot in enumerate(shots):
        a = round(shot['timelineStart']*24)+shift
        # A dissolve starts before the next nominal start. Keep it as part of
        # its composite; do not pretend these intervals are isolated raw shots.
        b = (round(shots[index+1]['timelineStart']*24)+shift
             if index+1 < len(shots) else component['out'])
        lo, hi = max(0,a), min(component['out'],b)
        if hi > lo:
            result.append({'start': lo, 'end': hi, 'name': shot['name'],
                'metadata': str(metadata), 'path': shot.get('path'),
                'original_declared_raw_in': shot['in']+lo-a,
                'original_declared_raw_out': shot['in']+hi-a,
                'warning': 'Historic declaration; transformed source equality and cut frame not verified'})
    return result


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--audit', required=True, type=Path)
    p.add_argument('--production', required=True, type=Path)
    p.add_argument('--output', required=True, type=Path)
    args = p.parse_args()
    board = read(args.audit/'edit-workboard.json')
    decisions = read('docs/film-audit/WHOLE-FILM-DECISIONS.json')
    baseline = read('docs/film-edits/baseline-concat-verified.edl.json')
    inventory = read(args.audit/'inventory.json')
    bindings = read('docs/film-audit/SOURCE-MAP-BINDINGS.json')
    registry = {x['output_sha256']: (read(x['edl']),x['edl']) for x in bindings['edls']}
    registry[baseline['outputSha256']] = (baseline,'baseline-concat-verified.json')
    mapped = resolve(board['movie_sha256'],0,21387,0,registry)
    components = {x['sha256']:x for x in baseline['shots']}
    cuts = []
    for span in mapped:
        component = components.get(span['source_sha256'])
        ranges = (component_ranges(component,args.production) if component else
                  [{'start':span['source_in'],'end':span['source_out'],
                    'name': Path(next((x['path'] for x in read(args.audit/'inventory.json')
                              if x['sha256']==span['source_sha256']), 'unresolved')).name,
                    'metadata': None,'path':None}])
        for item in ranges:
            lo,hi = max(item['start'],span['source_in']),min(item['end'],span['source_out'])
            if hi<=lo: continue
            a=span['timeline_start']+lo-span['source_in']
            b=a+hi-lo
            cuts.append({'start':a,'end':b,'current_reference':{
                **span,'source_in':lo,'source_out':hi}, 'historic_cut':item})
    # Independent section work feeds this one timeline, including explicit gaps.
    parcel = decisions['parcel_slots']
    closing = read('docs/film-audit/ENDING-SEQUENCE-PLAN.json')['shots']
    combs = read('docs/film-audit/COMBS-SEQUENCE-PLAN.json')['shots']
    overrides = [{**s,'selected_candidate':s} for s in parcel+combs+closing]
    for override in overrides:
        choice=override['selected_candidate']
        matches=[i for i in inventory if (choice.get('source_sha256')==i['sha256']
                 or (not choice.get('source_sha256') and
                     Path(choice.get('source') or '').name==Path(i['path']).name))]
        if matches:
            if len(set(i['sha256'] for i in matches))!=1:
                raise ValueError('Ambiguous candidate name; pin an explicit hash')
            choice['source_sha256']=matches[0]['sha256']
            choice['source_path']=matches[0]['path']
            choice['ledger_status']=matches[0]['status']
            # Keep the actual admitted limits alongside the proposal; this does
            # not infer that a candidate range or a context has passed them.
            choice['ledger_ranges']=matches[0].get('admitted_ranges',[])
    for override in overrides:
        a,b=override['start'],override['end']
        result=[]
        for old in cuts:
            if old['end']<=a or old['start']>=b:
                result.append(old);continue
            for lo,hi in ((old['start'],min(old['end'],a)),(max(old['start'],b),old['end'])):
                if hi>lo:
                    ref=dict(old['current_reference'])
                    ref['source_in'] += lo-old['start'];ref['source_out']=ref['source_in']+hi-lo
                    result.append({**old,'start':lo,'end':hi,'current_reference':ref})
        cuts=sorted(result+[override],key=lambda x:x['start'])
    for index,shot in enumerate(cuts):
        shot['id']=f'F{index+1:03}'
        beats=[b for b in board['beats'] if round(b['start']*24)<shot['end']
               and round(b['end']*24)>shot['start']]
        shot['beats']=[b['id'] for b in beats]
        if shot.get('historic_cut'):
            shot['historic_cut']['bounds_meaning']='Original historical shot in its component; NOT the shortened plan slot or a proposed raw trim.'
            ref=shot['current_reference']
            shot['component_subrange']={'in':ref['source_in'],'out':ref['source_out'],
                'offset_from_original_historic_start':ref['source_in']-shot['historic_cut']['start'],
                'meaning':'Current component coordinates only. Raw-source transformation still needs verification.'}
        shot['tasks']=sorted(set(t for b in beats for t in decisions['beats'][b['id']]['tasks']))
        shot['treatment']=[decisions['beats'][b['id']]['edit'] for b in beats]
        label=shot.get('historic_cut',{}).get('name','')
        if label in decisions.get('shot_overrides',{}):
            shot['treatment']=[decisions['shot_overrides'][label]]
        shot['required_state']=[decisions['beats'][b['id']]['state'] for b in beats]
        shot['story_purpose']=[b['purpose'] for b in beats]
        shot['evidence']=sorted(set(i['evidence'] for b in beats for i in b['review_intervals']
             if i['start_seconds']<shot['end']/24 and i['end_seconds']>shot['start']/24))
        shot['join_rule']='Preserve outgoing action, screen side, eyeline and named object state. '
        shot['join_rule']+='Review with previous and next shot at native rate and with sound; no padding or retiming.'
        shot['status']='candidate-plan-blocked-not-renderable'
        shot['previous']=f'F{index:03}' if index else None
        shot['next']=f'F{index+2:03}' if index+1<len(cuts) else None
    plan={'schema_version':1,'status':'whole-film-candidate-plan-NOT-final-or-renderable',
          'master_sha256':board['movie_sha256'],'fps':24,'frames':21387,
          'warning':'Complete timeline planning coverage is not complete source admission. '
          'Historic composite cut metadata remains provisional. Retain directives are conditional, not art approval.',
          'beat_decisions':decisions['beats'],'tasks':decisions['tasks'],'shots':cuts}
    validate(plan)
    write(args.output,plan)
    # Fast human navigation, no hidden allocation by word timing.
    lines=['# Whole-film candidate edit','',
        'Every interval has a treatment and linked task. This is NOT a final admitted EDL; unresolved choices block rendering.',
        '',f'{len(cuts)} candidate intervals; 47 story beats; 21,387 native frames. No new render or spending.',
        '', '| Interval | Time | Existing reference or proposed candidate | Story | Treatment / blocker |','|---|---|---|---|---|']
    for s in cuts:
        choice=s.get('selected_candidate',{})
        label=(choice.get('source') or choice.get('source_path') or
               s.get('historic_cut',{}).get('name') or 'UNRESOLVED COVERAGE')
        lines.append('| '+s['id']+' | '+f"{s['start']/24:.3f}–{s['end']/24:.3f}"+' | '+label+' | '+','.join(s['beats'])+' | '+
            '; '.join(s['treatment']).replace('|','/')+' **Tasks:** '+','.join(s['tasks'])+' |')
    args.output.with_suffix('.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    selected={s['selected_candidate']['source_sha256'] for s in cuts
              if s.get('selected_candidate',{}).get('source_sha256')}
    baseline_hashes=set(components)|set(registry)
    current_hashes={s['current_reference']['source_sha256'] for s in cuts if s.get('current_reference')}
    historic_paths={str((args.production/s['historic_cut']['path']).resolve()).lower()
                    for s in cuts if s.get('historic_cut',{}).get('path')}
    groups={}
    for item in inventory: groups.setdefault(item['sha256'],[]).append(item)
    classes=[]
    for sha,items in sorted(groups.items()):
        status=items[0]['status']
        if status in ('reject','exclude','exclude-assembly'):
            category='excluded-by-recorded-decision'
            reason=items[0].get('reason')
        elif status=='admit':
            category='admitted-ranges-only'
            reason='Only ledger ranges and mandatory crops are eligible; contextual review pending.'
        elif sha in selected:
            category='selected-candidate-admission-required'
            reason='Named by the consolidated edit; no eligibility inferred from its selection.'
        elif sha in baseline_hashes or all('/video/films/' in x['path'].replace('\\','/') for x in items):
            category='derived-film-reference-not-new-coverage'
            reason='Assembly/delivery export. Preserve as provenance, not an independent take.'
        elif sha in current_hashes or any(str(Path(x['path']).resolve()).lower() in historic_paths for x in items):
            category='current-cut-source-candidate'
            reason='Current source map or historic edit declaration links this candidate to current coverage; review exact source range before reuse.'
        else:
            category='reserve-pool-not-yet-selected'
            reason='Retained alternative inventory. Not approved or rejected by filename; inspect only when resolving a named task.'
        classes.append({'sha256':sha,'paths':[x['path'] for x in items],
            'category':category,'reason':reason,'ledger_status':status})
    write(args.output.with_name('INVENTORY-ROUTING.json'),{
        'status':'planning-classification-not-source-admission-or-complete-art-review',
        'path_count':len(inventory),'unique_hashes':len(classes),'sources':classes})
    print(json.dumps({'candidate_intervals':len(cuts),'beats':47,'frames':21387,
                      'status':plan['status']}))


if __name__=='__main__':main()
