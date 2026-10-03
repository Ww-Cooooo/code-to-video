"""有界的配置、时间采样与文件保留回归测试，不需要浏览器。"""
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('video', Path(__file__).resolve().parents[1]/'scripts/video.py')
video = importlib.util.module_from_spec(spec)
spec.loader.exec_module(video)


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)/'project'
        self.root.mkdir()
        (self.root/'index.html').write_text('<canvas id="film"></canvas>',encoding='utf-8')
        self.config = {'width':640,'height':360,'fps':24,'duration':3,'entry':'index.html'}
        self.save()

    def tearDown(self):
        self.temp.cleanup()

    def save(self):
        (self.root/'project.json').write_text(json.dumps(self.config),encoding='utf-8')

    def test_non_default_spec(self):
        root, config = video.load_project(self.root)
        self.assertEqual(root,self.root.resolve())
        self.assertEqual(config['duration']*config['fps'],72)

    def test_odd_dimensions_and_partial_frame_rejected(self):
        for changes in ({'width':641},{'duration':1.01}):
            original = dict(self.config)
            self.config.update(changes); self.save()
            with self.assertRaises(ValueError):
                video.load_project(self.root)
            self.config = original

    def test_missing_audio_not_silently_dropped(self):
        self.config['audio'] = {'path':'missing.wav'};self.save()
        with self.assertRaisesRegex(ValueError,'音轨'):
            video.load_project(self.root)

    def test_escaping_project_reference_rejected(self):
        outside = self.root.parent/'outside.html'
        outside.write_text('not public',encoding='utf-8')
        for entry in ('../outside.html',str(self.root/'index.html')):
            self.config['entry'] = entry;self.save()
            with self.assertRaisesRegex(ValueError,'工程内'):
                video.load_project(self.root)

    def test_review_samples_cover_transition(self):
        self.config['review_times'] = [.5,2.5]
        self.config['transitions'] = [1.5]
        times = video.review_times(self.config)
        self.assertIn(1.5,times)
        self.assertTrue(any(t<1.5 for t in times))
        self.assertTrue(any(t>1.5 for t in times))
        self.assertEqual(video.review_times(self.config,dense='1:1.5:0.125'),[1,1.125,1.25,1.375,1.5])
        with self.assertRaises(ValueError):
            video.review_times(self.config,dense='0:3:0.0001')

    def test_existing_export_is_preserved(self):
        output = self.root/'film.mp4';output.write_bytes(b'keep original')
        args = SimpleNamespace(project=str(self.root),out=str(output),browser=None)
        with patch.object(video,'executable',return_value='ffmpeg'):
            with self.assertRaisesRegex(ValueError,'不会覆盖'):
                video.render(args)
        self.assertEqual(output.read_bytes(),b'keep original')

    def test_existing_project_is_preserved(self):
        args = SimpleNamespace(project=str(self.root))
        with self.assertRaisesRegex(ValueError,'已存在'):
            video.init_project(args)
        self.assertTrue((self.root/'index.html').exists())

    def test_new_starter_has_requested_spec(self):
        target = self.root.parent/'new-film'
        args = SimpleNamespace(project=str(target),width=720,height=1280,fps=24,duration=2,title='中文标题')
        video.init_project(args)
        _,config = video.load_project(target)
        self.assertEqual((config['width'],config['height'],config['fps'],config['duration']),(720,1280,24,2))
        self.assertIn('中文标题',(target/'project.json').read_text(encoding='utf-8'))
        self.assertTrue((target/'film.mjs').is_file())


if __name__ == '__main__':
    unittest.main()
