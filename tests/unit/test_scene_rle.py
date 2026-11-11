import importlib.util
from pathlib import Path
import struct
import unittest
import zlib

spec = importlib.util.spec_from_file_location('scene_rle',Path(__file__).parents[2]/'tools/extractor/decode-scene-region.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SceneRLE(unittest.TestCase):
    def test_invalid_region_rejected_before_reading_source(self):
        for origin,size in [((-1,0),(8,8)),((60,60),(8,8)),((0,0),(0,8))]:
            with self.assertRaisesRegex(ValueError,'REGION_BOUNDS'):
                module.export(Path('missing-mock-input'),Path('unused-mock-output'),origin,size)

    def setUp(self):
        self.palette = bytes([i%64 for i in range(768)])
        self.header = struct.pack('<4h',4,2,-3,7)

    def test_mock_runs_alpha_zero_palette_and_signed_anchor(self):
        raw=self.header+bytes([4,1,2,0,1,0])
        image=module.decode(raw,self.palette)
        self.assertEqual((image['xOffset'],image['yOffset']),(-3,7))
        self.assertEqual(image['rgba'][3],0)
        self.assertEqual(image['rgba'][4:8],bytes([0,4,8,255]))
        self.assertEqual(image['rgba'][19],0)
        self.assertEqual(raw,self.header+bytes([4,1,2,0,1,0]))

    def test_mock_png_scanlines_and_chunk_checksums(self):
        image=module.decode(self.header+bytes([4,1,2,0,1,0]),self.palette)
        blob=module.png(4,2,image['rgba'])
        self.assertEqual(blob[:8],b'\x89PNG\r\n\x1a\n')
        cursor=8
        while cursor<len(blob):
            size=struct.unpack_from('>I',blob,cursor)[0]
            kind=blob[cursor+4:cursor+8];data=blob[cursor+8:cursor+8+size]
            self.assertEqual(struct.unpack_from('>I',blob,cursor+8+size)[0],zlib.crc32(kind+data))
            if kind==b'IDAT':
                self.assertEqual(zlib.decompress(data),b'\0'+image['rgba'][:16]+b'\0'+image['rgba'][16:])
            cursor+=12+size

    def test_mock_malformed_rows_dimensions_palette_and_trailing_bytes_rejected(self):
        for raw in [self.header,self.header+bytes([5,0]),self.header+bytes([2,5,0,0]),
                    self.header+bytes([3,0,4,1,0]),self.header+bytes([4,1,2,0,1,0,99])]:
            with self.assertRaises(ValueError):
                module.decode(raw,self.palette)
        with self.assertRaises(ValueError):
            module.decode(struct.pack('<4h',0,2,0,0)+b'\0\0',self.palette)
        with self.assertRaises(ValueError):
            module.decode(self.header,bytes([255])*768)
