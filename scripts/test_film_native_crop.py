import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image
from film_audit import native_detail, read


class NativeCropTests(unittest.TestCase):
    def test_crop_filter_and_provenance_are_explicit_and_separate(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            state={'frames':1,'movie':'unused.mp4','movie_sha256':'test',
                   'ffmpeg':'unused.exe','mandatory_crop_xywh':[0,0,1728,972]}
            def fake_run(args,**kwargs):
                self.assertIn('crop=1728:972:0:0',args)
                Image.new('RGB',(1728,972)).save(args[-1].replace('%06d','000000'))
            with patch('film_audit.subprocess.run',side_effect=fake_run):
                native_detail(root,state,0,1)
            output=root/'native-crop-0-0-1728-972/000000-000001'
            self.assertFalse((root/'native').exists())
            self.assertEqual(read(output/'provenance.json')['crop_xywh'],[0,0,1728,972])
            self.assertTrue((output/'sheet-00.jpg').is_file())

    def test_invalid_crop_is_not_silently_ignored(self):
        with self.assertRaises(ValueError):
            native_detail(Path('.'),{'frames':1,'mandatory_crop_xywh':[0,0,-2,10]},0,1)


if __name__=='__main__':unittest.main()
