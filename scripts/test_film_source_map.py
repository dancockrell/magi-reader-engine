import unittest
from film_source_map import normalize, resolve


def edl(shots, frames):
    return {'fps':24, 'frames':frames, 'shots':shots}


def shot(sha, a, b, t, crop=None):
    return {'sha256':sha, 'in':a, 'out':b, 'timelineStartFrame':t,
            'timelineEndFrame':t+b-a, 'crop':crop}


class MappingTests(unittest.TestCase):
    def test_nested_trim_crosses_internal_cut(self):
        child = edl([shot('A',10,20,0),shot('B',30,40,10)],20)
        parent = edl([shot('child',5,15,0)],10)
        result = resolve('parent',0,10,100,{'parent':(parent,'p'), 'child':(child,'c')})
        self.assertEqual([(r['source_sha256'],r['source_in'],r['source_out'],r['timeline_start']) for r in result], [('A',15,20,100),('B',30,35,105)])

    def test_crops_preserve_nested_order(self):
        child = edl([shot('A',0,10,0,'inner')],10)
        parent = edl([shot('child',0,10,0,'outer')],10)
        result = resolve('parent',0,10,0,{'parent':(parent,'p'), 'child':(child,'c')})
        self.assertEqual([x['crop_whxy'] for x in result[0]['crop_pipeline']],['inner','outer'])

    def test_gap_rejected(self):
        with self.assertRaises(ValueError): normalize(edl([shot('A',0,10,1)],11))

    def test_fitting_rejected(self):
        s = shot('A',0,10,0); s['timelineEndFrame'] = 12
        with self.assertRaises(ValueError): normalize(edl([s],12))

    def test_cycle_rejected(self):
        with self.assertRaises(ValueError): resolve('a',0,10,0,{'a':(edl([shot('a',0,10,0)],10),'a')})

    def test_seconds_and_index_source(self):
        e = {'fps':24,'frames':24,'sources':[{'sha256':'A'}],
             'shots':[{'input':0,'in':4,'out':28,'timelineStart':0,'timelineEnd':1}]}
        self.assertEqual(normalize(e)[0]['sha256'],'A')


if __name__ == '__main__': unittest.main()
