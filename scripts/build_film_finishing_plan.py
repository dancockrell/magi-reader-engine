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


def candidate_sources(choice):
    """Enumerate actual picture sources, including both sides of a transition."""
    if choice.get('kind') == 'transition':
        return choice.get('layers', [])
    return [choice] if choice.get('source_sha256') else []


def opening_overrides(opening):
    """Translate the scoped opening design without inventing padding or seeks."""
    if opening['timeline'] != [0, 1423] or opening['narration_entrance_frame'] != 222:
        raise ValueError('Opening must preserve its section handover and narration entrance')
    sources = {s['id']: s for s in opening['sources']}

    def source(layer):
        raw = sources[layer['source']]
        return {'source': raw['path'], 'source_sha256': raw['sha256'],
                'source_in': layer['source_range'][0],
                'source_out': layer['source_range'][1],
                'source_frames': raw['frame_count'],
                'crop_xywh': raw['mandatory_crop_xywh'],
                **({'opacity': layer['opacity']} if 'opacity' in layer else {})}

    result = []
    for s in opening['shots']:
        choice = {'section_shot_id': s['id'], 'section': 'opening',
                  'start': s['timeline'][0], 'end': s['timeline'][1],
                  'purpose': s['beat'], 'join_out': s['join_out']}
        if s.get('kind') == 'transition':
            choice.update(kind='transition', transition='dissolve',
                          layers=[source(layer) for layer in s['layers']])
        else:
            choice.update(source(s))
        if s['id'] == 'O01':
            choice['title_design'] = opening['title']
        result.append({'start': choice['start'], 'end': choice['end'],
                       'selected_candidate': choice})
    return result


def mirror_overrides(plan):
    """Keep reviewed handles and unresolved coverage explicit in one timeline."""
    if (plan['scope']['start'], plan['scope']['end']) != (4351, 6869):
        raise ValueError('Mirror section handover changed')
    spans = [{**s, 'crop_xywh': None, 'section': 'mirror-hair'}
             for s in plan['exact_build_sections']]
    spans += [{**s, 'purpose': s['need'], 'section': 'mirror-hair',
               'status': 'unresolved-coverage-no-padding'}
              for s in plan['unresolved_slots']]
    spans.sort(key=lambda s: s['start'])
    cursor = 4351
    for s in spans:
        if s['start'] != cursor or s['end'] <= cursor:
            raise ValueError('Mirror section has an unaccounted gap or overlap')
        cursor = s['end']
    if cursor != 6869:
        raise ValueError('Mirror section is incomplete')
    return [{'start': s['start'], 'end': s['end'], 'selected_candidate': s}
            for s in spans]


def validate(plan):
    cursor = 0
    for index, shot in enumerate(plan['shots']):
        if shot['start'] != cursor or shot['end'] <= cursor:
            raise ValueError('Plan timeline gap/overlap')
        if not shot['beats'] or not shot['tasks'] or not shot['treatment']:
            raise ValueError('Unplanned interval')
        choice = shot.get('selected_candidate')
        if choice:
            if choice.get('kind') == 'transition':
                layers = choice.get('layers', [])
                if (choice.get('source_sha256') or len(layers) != 2 or
                        choice.get('transition') != 'dissolve' or
                        [x.get('opacity') for x in layers] != ['1-to-0', '0-to-1']):
                    raise ValueError('Transition must explicitly define its two picture layers')
                if choice.get('section') == 'opening':
                    if index == 0 or index+1 == len(plan['shots']):
                        raise ValueError('Opening transition needs both neighboring shots')
                    before=plan['shots'][index-1].get('selected_candidate',{})
                    after=plan['shots'][index+1].get('selected_candidate',{})
                    outgoing,incoming=layers
                    if (before.get('source_sha256') != outgoing.get('source_sha256') or
                            before.get('source_out') != outgoing.get('source_in') or
                            after.get('source_sha256') != incoming.get('source_sha256') or
                            after.get('source_in') != incoming.get('source_out') or
                            before.get('crop_xywh') != outgoing.get('crop_xywh') or
                            after.get('crop_xywh') != incoming.get('crop_xywh')):
                        raise ValueError('Opening dissolve must continue both native sources without restarting')
            for source in candidate_sources(choice):
                if (not source.get('source_sha256') or
                        type(source.get('source_in')) is not int or
                        type(source.get('source_out')) is not int or
                        source['source_in'] < 0 or
                        source['source_out'] <= source['source_in']):
                    raise ValueError('Candidate requires exact native bounds and a pinned source')
                if source['source_out']-source['source_in'] != shot['end']-shot['start']:
                    raise ValueError('Candidate would require retiming')
                if source.get('source_frames') is not None and source['source_out'] > source['source_frames']:
                    raise ValueError('Candidate exceeds native source length')
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
    opening = read('docs/film-audit/OPENING-SEQUENCE-PLAN.json')
    chain = read('docs/film-audit/CHAIN-SEQUENCE-PLAN.json')['shots']
    departure_plan = read('docs/film-audit/DEPARTURE-PURCHASE-SEQUENCE-PLAN.json')
    departure = [{**s, 'section': 'departure-purchase'} for s in departure_plan['shots']]
    if (departure_plan['start'], departure_plan['end']) != (6869, 9832):
        raise ValueError('Departure/purchase must preserve both neighboring section boundaries')
    retained_plan = read('docs/film-audit/RETAINED-MASTER-SELECTIONS.json')
    retained = [{**s, 'source': retained_plan['source_path'],
                 'source_sha256': retained_plan['movie_sha256'],
                 'source_in': s['start'], 'source_out': s['end'],
                 'crop_xywh': None, 'purpose': s['reason'],
                 'status': 'source-admitted-context-pending'}
                for s in retained_plan['selections']]
    overrides = opening_overrides(opening) + mirror_overrides(
                read('docs/film-audit/MIRROR-HAIR-SEQUENCE-PLAN.json')) + [{**s,'selected_candidate':s}
                for s in retained+departure+parcel+combs+chain+closing]
    for override in overrides:
      container=override['selected_candidate']
      # Unpinned legacy named choices still need resolving; gaps remain gaps.
      choices=candidate_sources(container) if container.get('kind')=='transition' else [container]
      for choice in choices:
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
        if shot.get('selected_candidate',{}).get('section') in ('opening', 'departure-purchase', 'mirror-hair'):
            shot['treatment']=[shot['selected_candidate']['purpose']]
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
    plan['opening_audio'] = opening['audio']
    plan['opening_narration_entrance_frame'] = opening['narration_entrance_frame']
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
        if choice.get('kind') == 'transition':
            label = '18-frame book-to-Della dissolve: ' + ' + '.join(
                f"{Path(layer['source']).name} [{layer['source_in']},{layer['source_out']}) {layer['opacity']}"
                for layer in choice['layers'])
        lines.append('| '+s['id']+' | '+f"{s['start']/24:.3f}–{s['end']/24:.3f}"+' | '+label+' | '+','.join(s['beats'])+' | '+
            '; '.join(s['treatment']).replace('|','/')+' **Tasks:** '+','.join(s['tasks'])+' |')
    args.output.with_suffix('.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    selected={source['source_sha256'] for s in cuts
              for source in candidate_sources(s.get('selected_candidate',{}))}
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
