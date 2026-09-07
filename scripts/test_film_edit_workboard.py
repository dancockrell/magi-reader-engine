import copy
import unittest
from film_edit_workboard import build


class WorkboardTests(unittest.TestCase):
    def setUp(self):
        self.state = dict(phase='inventory-review-required', movie_sha256='abc', samples=12)
        self.beats = [dict(id='B0', start=0, end=1), dict(id='B1', start=1, end=2)]
        self.receipt = dict(movie_sha256='abc', sample_start=0, sample_end=12,
                            shots=[dict(start=0, end=2, observed='One continuous action',
                                        decision='inspect', reason='Needs native detail')])

    def test_one_interval_can_cross_beats_without_claiming_two_shots(self):
        board = build(self.state, self.beats, [('000000.json', self.receipt)])
        self.assertEqual(board['review_interval_count'], 1)
        self.assertEqual(board['beat_count'], 2)
        self.assertTrue(all(not b['final_shots'] for b in board['beats']))
        self.assertEqual(board['status'], 'editing_workboard_not_renderable')

    def test_wrong_master_fails(self):
        self.receipt['movie_sha256'] = 'wrong'
        with self.assertRaises(ValueError):
            build(self.state, self.beats, [('receipt', self.receipt)])

    def test_missing_receipt_fails(self):
        self.receipt['sample_start'] = 6
        with self.assertRaises(ValueError):
            build(self.state, self.beats, [('receipt', self.receipt)])

    def test_incomplete_tail_fails(self):
        self.receipt['sample_end'] = 6
        with self.assertRaises(ValueError):
            build(self.state, self.beats, [('receipt', self.receipt)])

    def test_unreviewed_beat_fails(self):
        beats = copy.deepcopy(self.beats)
        beats.append(dict(id='B2', start=2, end=3))
        with self.assertRaises(ValueError):
            build(self.state, beats, [('receipt', self.receipt)])


if __name__ == '__main__':
    unittest.main()
