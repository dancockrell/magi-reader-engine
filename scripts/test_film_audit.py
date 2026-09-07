import copy
import tempfile
import unittest
from pathlib import Path
from film_audit import digest, resolve_beats, validate_receipt, validate_plan, source_decision, supplemental_context, write


class ReviewGates(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.sheet = Path(self.tmp.name)/'sheet.jpg'
        self.sheet.write_bytes(b'test evidence')
        self.request = {'movie_sha256':'abc','sample_start':0,'sample_end':72,
                        'seconds':[0,12], 'sheets':[str(self.sheet)],
                        'sheet_sha256':{str(self.sheet):digest(self.sheet)},
                        'context_samples':list(range(78))}
        self.receipt = {k:copy.deepcopy(self.request[k]) for k in ('movie_sha256','sample_start','sample_end')}
        self.receipt.update(viewed_sheets=[str(self.sheet)],
            judgments={k:'A sufficiently detailed observation for this isolated validator test.' for k in
                       ('continuity','relevance','writer_fidelity','heartfelt_love')},
            shots=[{'start':0,'end':12,'observed':'A concrete observation in the test fixture.',
                    'decision':'inspect'}], entities=[])

    def test_valid_receipt(self):
        validate_receipt(self.request,self.receipt)

    def test_cannot_skip_sheet(self):
        self.receipt['viewed_sheets']=[]
        with self.assertRaises(ValueError): validate_receipt(self.request,self.receipt)

    def test_cannot_skip_time(self):
        self.receipt['shots'][0]['end']=11
        with self.assertRaises(ValueError): validate_receipt(self.request,self.receipt)

    def test_cannot_skip_emotional_reading(self):
        self.receipt['judgments']['heartfelt_love']='pass'
        with self.assertRaises(ValueError): validate_receipt(self.request,self.receipt)

    def test_reject_stale_film(self):
        self.receipt['movie_sha256']='other'
        with self.assertRaises(ValueError): validate_receipt(self.request,self.receipt)

    def test_reject_replaced_evidence(self):
        self.sheet.write_bytes(b'changed')
        with self.assertRaises(ValueError): validate_receipt(self.request,self.receipt)

    def test_reject_bad_entity(self):
        self.receipt['entities']=[{'id':'CHAIN'}]
        with self.assertRaises(ValueError): validate_receipt(self.request,self.receipt)

    def test_later_corrections_are_carried_forward(self):
        folder=Path(self.tmp.name)/'supplemental'
        folder.mkdir()
        correction=folder/'correction.json'
        correction.write_text('{"finding":"Earlier ambiguity resolved by native frames."}')
        records=supplemental_context(Path(self.tmp.name))
        self.assertEqual(records[0]['record']['finding'], 'Earlier ambiguity resolved by native frames.')
        self.request['supplemental_reviews']=records
        validate_receipt(self.request,self.receipt)
        correction.write_text('{"finding":"Changed after review began."}')
        with self.assertRaises(ValueError): validate_receipt(self.request,self.receipt)

    def test_storyboard_must_follow_narrative(self):
        cues=[{'text':'First','start':1},{'text':'Second','start':2}]
        with self.assertRaises(ValueError):
            resolve_beats({'beats':[['s1','Second','x'],['s1','First','y']]},cues,3)

    def test_storyboard_cannot_invent_caption_anchor(self):
        with self.assertRaises(ValueError):
            resolve_beats({'beats':[['s1','Missing','x']]},[],3)

    def test_cannot_plan_before_whole_film_review(self):
        with self.assertRaises(ValueError):
            validate_plan(Path(self.tmp.name),{'phase':'film-review'},'not-read')

    def test_cannot_admit_source_before_whole_film_review(self):
        with self.assertRaises(ValueError):
            source_decision(Path(self.tmp.name),{'phase':'film-review'},'not-read')

    def source_fixture(self):
        root = Path(self.tmp.name)
        movie = root/'source.mp4'
        movie.write_bytes(b'pinned source fixture, not a media decode test')
        sha = digest(movie)
        source = root/'sources'/sha
        state = {'movie':str(movie), 'movie_sha256':sha, 'phase':'inventory-review-required',
                 'cursor':72, 'samples':72, 'frames':288, 'stride':4, 'fps':24, 'packet_samples':72}
        write(source/'state.json',state)
        receipt = {'movie_sha256':sha, 'sample_start':0, 'sample_end':72, 'escalations':[]}
        write(source/'reviews'/'000000.json',receipt)
        write(root/'inventory.json',[{'sha256':sha,'status':'unreviewed'}])
        record = {'sha256':sha,'status':'admit', 'reason':'A reviewed native range with a documented compatible prop design.',
                  'evidence':[str(self.sheet)], 'admitted_ranges':[
                      {'start':0,'end':48,'entity_compatibility':'matching selected design','crop':None}]}
        path=root/'decision.json'
        write(path,record)
        return root,source,state,receipt,record,path

    def test_source_admission_uses_receipts_not_checkbox(self):
        root,source,state,receipt,record,path=self.source_fixture()
        source_decision(root,{'phase':'inventory-review-required'},path)
        self.assertTrue((root/'source-decisions'/f'{record["sha256"]}.json').exists())

    def test_missing_source_receipt_rejects_checkbox(self):
        root,source,state,receipt,record,path=self.source_fixture()
        (source/'reviews'/'000000.json').unlink()
        record['sample_review_complete']=True
        write(path,record)
        with self.assertRaisesRegex(ValueError,'receipts'):
            source_decision(root,{'phase':'inventory-review-required'},path)

    def test_out_of_bounds_source_admission(self):
        root,source,state,receipt,record,path=self.source_fixture()
        record['admitted_ranges'][0]['end']=999999999
        write(path,record)
        with self.assertRaisesRegex(ValueError,'native integer bounds'):
            source_decision(root,{'phase':'inventory-review-required'},path)

    def test_incomplete_source_state(self):
        root,source,state,receipt,record,path=self.source_fixture()
        state['cursor']=0
        write(source/'state.json',state)
        with self.assertRaisesRegex(ValueError,'incomplete'):
            source_decision(root,{'phase':'inventory-review-required'},path)

    def test_changed_source_rejected(self):
        root,source,state,receipt,record,path=self.source_fixture()
        Path(state['movie']).write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'Master changed'):
            source_decision(root,{'phase':'inventory-review-required'},path)

    def test_unresolved_source_concern_rejected(self):
        root,source,state,receipt,record,path=self.source_fixture()
        receipt['escalations']=[{'seconds':[0,1], 'reason':'Visible ring appears detached.'}]
        write(source/'reviews'/'000000.json',receipt)
        with self.assertRaisesRegex(ValueError,'Unresolved source escalation'):
            source_decision(root,{'phase':'inventory-review-required'},path)
        record['escalation_resolutions']={'000000:0':{'status':'excluded-range'}}
        write(path,record)
        with self.assertRaisesRegex(ValueError,'overlaps'):
            source_decision(root,{'phase':'inventory-review-required'},path)
        record['admitted_ranges'][0].update(start=48,end=72)
        write(path,record)
        source_decision(root,{'phase':'inventory-review-required'},path)


if __name__=='__main__':
    unittest.main()
