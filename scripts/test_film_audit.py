import copy
import tempfile
import unittest
from pathlib import Path
from film_audit import digest, resolve_beats, validate_receipt


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

    def test_storyboard_must_follow_narrative(self):
        cues=[{'text':'First','start':1},{'text':'Second','start':2}]
        with self.assertRaises(ValueError):
            resolve_beats({'beats':[['s1','Second','x'],['s1','First','y']]},cues,3)

    def test_storyboard_cannot_invent_caption_anchor(self):
        with self.assertRaises(ValueError):
            resolve_beats({'beats':[['s1','Missing','x']]},[],3)


if __name__=='__main__':
    unittest.main()
