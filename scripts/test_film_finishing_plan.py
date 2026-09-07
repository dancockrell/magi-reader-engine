import unittest
from pathlib import Path
from build_film_finishing_plan import read, validate, candidate_sources


class FinishingPlanTests(unittest.TestCase):
    def setUp(self):
        self.plan=read(Path(__file__).resolve().parents[1]/
                       'docs/film-audit/WHOLE-FILM-CANDIDATE-PLAN.json')

    def test_whole_timeline_and_all_story_beats(self):
        validate(self.plan)
        self.assertEqual(self.plan['frames'],21387)
        self.assertEqual(len(self.plan['beat_decisions']),47)

    def test_retained_master_keeps_its_original_time(self):
        sha='852574ecb47757dd45b3d56293ec05b6af0547efcdbd5257b71e083997b3ef3b'
        retained=[s for s in self.plan['shots']
                  if s.get('selected_candidate',{}).get('source_sha256')==sha]
        self.assertEqual(sum(s['end']-s['start'] for s in retained),959)
        for s in retained:
            c=s['selected_candidate']
            self.assertEqual((c['source_in'],c['source_out']),(s['start'],s['end']))
            self.assertIsNone(c['crop_xywh'])

    def test_chain_section_keeps_palm_gap_and_continuous_performance(self):
        shots=[s for s in self.plan['shots'] if 18280 <= s['start'] < 18957]
        self.assertEqual(len(shots),4)
        self.assertEqual(sum(s['end']-s['start'] for s in shots),677)
        self.assertFalse(shots[0]['selected_candidate'].get('source_sha256'))
        self.assertEqual(shots[0]['end']-shots[0]['start'],192)
        della=[s for s in shots if s['selected_candidate'].get('source_sha256')==
               'bdf5093956be17f63f708038a7fd216c83f74115712d27a9622aaff7e1f44d31']
        self.assertEqual(len(della),1)
        self.assertEqual(della[0]['end']-della[0]['start'],240)

    def test_departure_purchase_is_complete_existing_coverage(self):
        shots = [s for s in self.plan['shots'] if 6869 <= s['start'] < 9832]
        self.assertEqual(len(shots), 17)
        self.assertEqual(sum(s['end']-s['start'] for s in shots), 2963)
        self.assertEqual((shots[0]['start'], shots[-1]['end']), (6869,9832))
        seen = {}
        for s in shots:
            c = s['selected_candidate']
            self.assertEqual(c['section'], 'departure-purchase')
            self.assertEqual(c['ledger_status'], 'admit')
            self.assertEqual(c['source_out']-c['source_in'], s['end']-s['start'])
            self.assertTrue(any(r['start'] <= c['source_in'] and r['end'] >= c['source_out']
                                and r['crop'] == c['crop_xywh'] for r in c['ledger_ranges']))
            for lo, hi in seen.get(c['source_sha256'], []):
                self.assertTrue(c['source_out'] <= lo or c['source_in'] >= hi)
            seen.setdefault(c['source_sha256'], []).append((c['source_in'],c['source_out']))

    def test_departure_preserves_prop_and_merchant_exclusions(self):
        by_id = {s['selected_candidate'].get('id'): s['selected_candidate']
                 for s in self.plan['shots'] if s.get('selected_candidate')}
        self.assertEqual(by_id['DP13']['source_out']-by_id['DP13']['source_in'],72)
        self.assertEqual(by_id['DP13']['crop_xywh'],[420,180,960,540])
        self.assertEqual(by_id['DP11']['crop_xywh'],[100,100,960,540])
        self.assertEqual(by_id['DP15']['crop_xywh'],[260,320,1280,720])
        self.assertEqual(by_id['DP17']['crop_xywh'],[0,0,1472,828])

    def test_not_renderable_or_admitted_by_planning(self):
        self.assertIn('NOT-final-or-renderable',self.plan['status'])
        self.assertTrue(all(s['status']=='candidate-plan-blocked-not-renderable'
                            for s in self.plan['shots']))

    def test_gap_fails(self):
        self.plan['shots'][1]['start']+=1
        with self.assertRaises(ValueError):validate(self.plan)

    def test_overlapping_shot_fails(self):
        self.plan['shots'][1]['start']-=1
        with self.assertRaises(ValueError):validate(self.plan)

    def test_unplanned_interval_fails(self):
        self.plan['shots'][3]['tasks']=[]
        with self.assertRaises(ValueError):validate(self.plan)

    def test_retiming_fails(self):
        target=next(s for s in self.plan['shots'] if
                    s.get('selected_candidate',{}).get('source_sha256'))
        target['selected_candidate']['source_out']+=1
        with self.assertRaises(ValueError):validate(self.plan)

    def test_admitted_ending_not_duplicated_to_fill_gap(self):
        sha='898dd17709a1734428d3e3d8f10965c82293082ce4c751f90d5ff8538f1e73c4'
        uses=[s for s in self.plan['shots'] if
              s.get('selected_candidate',{}).get('source_sha256')==sha]
        self.assertEqual(len(uses),1)
        self.assertEqual((uses[0]['start'],uses[0]['end']),(20364,20604))
        gap=next(s for s in self.plan['shots'] if s['start']==20004)
        self.assertEqual(gap['end']-gap['start'],360)
        self.assertFalse(gap['selected_candidate'].get('source_sha256'))

    def test_every_selected_existing_source_is_hash_pinned(self):
        for shot in self.plan['shots']:
            for candidate in candidate_sources(shot.get('selected_candidate',{})):
                self.assertEqual(len(candidate['source_sha256']),64)
                self.assertTrue(candidate['source_path'])

    def test_recollection_is_not_overwritten_by_caption_overlap(self):
        walk=next(s for s in self.plan['shots'] if
                  s.get('selected_candidate',{}).get('section_shot_id')=='O05')
        self.assertIn('remembered',walk['treatment'][0])
        self.assertIn('not her later',walk['treatment'][0])
        treatments=[t for s in self.plan['shots'] for t in s['treatment']]
        self.assertTrue(any('wages/affection' in t for t in treatments))
        self.assertTrue(any('reduced-wages' in t for t in treatments))

    def test_opening_is_exact_and_counting_never_restarts(self):
        shots=[s for s in self.plan['shots'] if s['start'] < 1423]
        self.assertEqual(len(shots),11)
        self.assertEqual(shots[-1]['end'],1423)
        self.assertEqual(self.plan['opening_narration_entrance_frame'],222)
        transition=shots[1]
        self.assertEqual((transition['start'],transition['end']),(204,222))
        layers=transition['selected_candidate']['layers']
        self.assertEqual([(x['source_in'],x['source_out']) for x in layers],
                         [(204,222),(0,18)])
        wide=shots[2]['selected_candidate']
        self.assertEqual(wide['source_sha256'],layers[1]['source_sha256'])
        self.assertEqual((wide['source_in'],wide['source_out']),(18,121))
        self.assertEqual(shots[2]['end']-transition['start'],121)
        for shot in shots:
            for source in candidate_sources(shot['selected_candidate']):
                self.assertEqual(source['ledger_status'],'admit')

    def test_transition_missing_layer_fails(self):
        self.plan['shots'][1]['selected_candidate']['layers'].pop()
        with self.assertRaises(ValueError):validate(self.plan)

    def test_transition_layer_retiming_fails(self):
        self.plan['shots'][1]['selected_candidate']['layers'][1]['source_out']+=1
        with self.assertRaises(ValueError):validate(self.plan)

    def test_counting_restart_after_dissolve_fails(self):
        source=self.plan['shots'][2]['selected_candidate']
        source['source_in']-=18
        source['source_out']-=18
        with self.assertRaises(ValueError):validate(self.plan)

    def test_transition_unpinned_layer_fails(self):
        self.plan['shots'][1]['selected_candidate']['layers'][1]['source_sha256']=None
        with self.assertRaises(ValueError):validate(self.plan)

    def test_transition_invalid_opacity_fails(self):
        self.plan['shots'][1]['selected_candidate']['layers'][1]['opacity']='1-to-0'
        with self.assertRaises(ValueError):validate(self.plan)

    def test_opening_native_source_overflow_fails(self):
        source=self.plan['shots'][0]['selected_candidate']
        source['source_in']+=1000
        source['source_out']+=1000
        with self.assertRaises(ValueError):validate(self.plan)

    def test_reaction_retains_mandatory_crop(self):
        reaction=next(s['selected_candidate'] for s in self.plan['shots'] if
                      s.get('selected_candidate',{}).get('section_shot_id')=='O06')
        self.assertEqual(reaction['crop_xywh'],[100,0,1440,810])
        self.assertEqual((reaction['source_in'],reaction['source_out']),(0,215))

    def test_clipped_historical_bounds_are_separate(self):
        shot=next(s for s in self.plan['shots'] if s.get('component_subrange'))
        self.assertEqual(shot['component_subrange']['out']-shot['component_subrange']['in'],
                         shot['end']-shot['start'])
        self.assertIn('NOT the shortened',shot['historic_cut']['bounds_meaning'])

    def test_combs_plan_is_integrated_and_cannot_restore_full_case(self):
        selections=[s['selected_candidate'] for s in self.plan['shots']
                    if 17076 <= s['start'] < 18280]
        self.assertEqual(len(selections),7)
        self.assertEqual(sum(s['end']-s['start'] for s in selections),1204)
        hug=next(s for s in selections if s.get('source_sha256')==
            'f770030cc55e91bfa6fd1e22e5faed081522d544544b763dc7e8aa8afb4ce445')
        box_hashes={'c053541f0d27eee05abaf0fa848a5bdd035df593865f4bdedbae2e29aea1de91',
                    'bf0a3838760cf93a3ccc6c1194b2480d206839911b2c78bf664368be09ce4dc3'}
        self.assertFalse(any(s.get('source_sha256') in box_hashes
                             and s['start'] >= hug['start'] for s in selections))

    def test_current_source_is_not_routed_to_reserve(self):
        routing=read(Path(__file__).resolve().parents[1]/'docs/film-audit/INVENTORY-ROUTING.json')
        categories={r['sha256']:r['category'] for r in routing['sources']}
        for shot in self.plan['shots']:
            ref=shot.get('current_reference')
            if ref and ref['source_sha256'] in categories:
                self.assertNotEqual(categories[ref['source_sha256']], 'reserve-pool-not-yet-selected')


if __name__=='__main__':unittest.main()
