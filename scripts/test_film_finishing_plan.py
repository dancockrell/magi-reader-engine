import unittest
from pathlib import Path
from build_film_finishing_plan import read, validate


class FinishingPlanTests(unittest.TestCase):
    def setUp(self):
        self.plan=read(Path(__file__).resolve().parents[1]/
                       'docs/film-audit/WHOLE-FILM-CANDIDATE-PLAN.json')

    def test_whole_timeline_and_all_story_beats(self):
        validate(self.plan)
        self.assertEqual(self.plan['frames'],21387)
        self.assertEqual(len(self.plan['beat_decisions']),47)

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
            candidate=shot.get('selected_candidate',{})
            if candidate.get('source_in') is not None:
                self.assertEqual(len(candidate['source_sha256']),64)
                self.assertTrue(candidate['source_path'])

    def test_recollection_is_not_overwritten_by_caption_overlap(self):
        by_id={s['id']:s for s in self.plan['shots']}
        self.assertIn('walking recollection',by_id['F005']['treatment'][0])
        self.assertIn('wages/affection',by_id['F018']['treatment'][0])
        self.assertIn('reduced-wages',by_id['F019']['treatment'][0])

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
