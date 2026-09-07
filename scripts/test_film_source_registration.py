import tempfile
import unittest
from pathlib import Path
from film_audit import digest, read, write, register_source


class RegistrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.movie = self.root/'take.mp4'
        self.movie.write_bytes(b'fixture, not actual video')
        self.old = {'path': str(self.root/'old.mp4'), 'sha256': 'old', 'status': 'reject'}
        write(self.root/'inventory.json', [self.old])
        self.record = {'path': str(self.movie), 'sha256': digest(self.movie),
                       'creation_identifier': 'test',
                       'reason': 'Retrieve an already completed take without resetting existing source reviews.'}
        self.path = self.root/'input.json'
        self.state = {'phase': 'inventory-review-required'}

    def run_registration(self):
        write(self.path, self.record)
        register_source(self.root, self.state, self.path)

    def test_append_and_idempotent_preserve(self):
        self.run_registration()
        self.run_registration()
        items = read(self.root/'inventory.json')
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0], self.old)
        self.assertEqual(items[1]['status'], 'unreviewed')
        self.assertEqual(items[1]['admitted_ranges'], [])

    def test_digest_mismatch(self):
        self.record['sha256'] = 'wrong'
        with self.assertRaises(ValueError): self.run_registration()
        self.assertEqual(read(self.root/'inventory.json'), [self.old])

    def test_changed_existing_path(self):
        self.run_registration()
        self.movie.write_bytes(b'changed source')
        self.record['sha256'] = digest(self.movie)
        with self.assertRaises(ValueError): self.run_registration()

    def test_review_gate(self):
        self.state['phase'] = 'film-review'
        with self.assertRaises(ValueError): self.run_registration()


if __name__ == '__main__':
    unittest.main()
