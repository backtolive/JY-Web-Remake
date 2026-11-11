import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "extractor"))
from convert_original_event_corpus import convert_event, ranges_from_index, talk_tokens


class OriginalEventConversionTests(unittest.TestCase):
    def test_end_index_builds_exact_ranges(self):
        self.assertEqual(ranges_from_index(bytes.fromhex("0200000005000000"), 5), [(0, 2), (2, 5)])

    def test_end_index_rejects_wrong_terminal(self):
        with self.assertRaisesRegex(ValueError, "IDX_BOUNDS"):
            ranges_from_index(bytes.fromhex("0200000004000000"), 5)

    def test_talk_retains_text_and_inline_controls(self):
        raw = bytes(value ^ 0xFF for value in b"Hi*X\xff")
        result = talk_tokens(raw)
        self.assertTrue(result["decoded"])
        self.assertEqual(result["tokens"], [
            {"kind": "text", "text": "Hi"},
            {"kind": "lineBreak", "offset": 2},
            {"kind": "text", "text": "X"},
        ])

    def test_dialogue_instruction_keeps_source_offset_and_parameters(self):
        raw = b"\x01\x00\x2c\x01\x07\x00\x01\x00\xff\xff"
        table = {1: {"words": 4, "branchSlots": []}}
        result = convert_event(4, 200, raw, table)
        self.assertEqual(result[0]["sourceByteOffset"], 200)
        self.assertEqual(result[0]["dialogueRef"], {"talkId": 300, "portraitId": 7, "side": 1})
        self.assertEqual(result[-1]["kind"], "terminator")

    def test_unmapped_instruction_is_not_skipped(self):
        with self.assertRaisesRegex(ValueError, "EVENT_UNKNOWN_OPCODE:9@0:24"):
            convert_event(9, 0, b"\x18\x00\xff\xff", {})


if __name__ == "__main__":
    unittest.main()
