import importlib.util
from pathlib import Path
import struct
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('tile_headers', Path(__file__).parents[2] / 'tools/analyzer/probe-tile-headers.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class TileHeaders(unittest.TestCase):
    def test_mock_candidate_offsets_and_immutable_inputs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            headers = b''.join(struct.pack('<4h', 10+i, 20+i, -i, i) for i in range(5))
            index = struct.pack('<5I', 8, 16, 24, 32, 40)
            maps = bytearray(49152 * 2)
            struct.pack_into('<h', maps, 49152 + (28*64+13)*2, 4)
            for name, raw in {'MMAP.IDX':index,'MMAP.GRP':headers,'SDX001':index,'SMP001':headers,'ALLSIN.GRP':maps}.items():
                (root/name).write_bytes(raw)
            before = {p.name:p.read_bytes() for p in root.iterdir()}
            report = module.probe(root)
            self.assertEqual(report, module.probe(root))
            candidates = report['entries'][0]['candidates']
            self.assertEqual([c['resourceId'] for c in candidates], [4,2,4,2])
            self.assertEqual(candidates[3]['sourceOffset'],16)
            self.assertEqual(candidates[3]['header']['width'],12)
            self.assertEqual(before,{p.name:p.read_bytes() for p in root.iterdir()})
