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

    def test_dos_55_evidence_stays_scoped_and_preserves_the_parameter_overlap(self):
        import struct
        table = {55: {"words": 5, "branchSlots": [3, 4]},
                 0: {"words": 1, "branchSlots": []},
                 3: {"words": 14, "branchSlots": []}}
        words = [55, 2, -1, 14, 0, 3, -2, 2, -2, -2, 862,
                 -1, -1, -2, -2, -2, -2, -2, -2, -1]
        raw = struct.pack("<20h", *words)
        ordinary = convert_event(464, 100, raw, table)
        self.assertNotIn("originalDosCursor", ordinary[0])
        scoped = convert_event(464, 100, raw, table, verified_dos_55=True)
        self.assertEqual(scoped[0]["originalDosCursor"]["nextWordOffset"], 4)
        self.assertEqual(scoped[0]["originalDosCursor"]["nextWordValue"], 0)
        self.assertEqual(scoped[0]["candidateBranchTargets"], [19, 5])
        self.assertEqual(scoped[0]["originalDosCursor"]["evidence"], "Verified Original")
        self.assertFalse(convert_event(10, 100, raw, table, verified_dos_55=True)[0]["originalDosCursor"]["runtimeEffectVerified"])
        changed_words = words.copy()
        changed_words[4] = 1
        changed = struct.pack("<20h", *changed_words)
        with self.assertRaisesRegex(ValueError, "DOS_55_EVIDENCE_SCOPE"):
            convert_event(464, 100, changed, table, verified_dos_55=True)

    def test_opcode_3_after_55_annotation_requires_exact_shape_and_source_scope(self):
        import struct
        table = {55: {"words": 5, "branchSlots": [3, 4]},
                 3: {"words": 14, "branchSlots": []}}
        words = [55, 2, -1, 14, 0, 3, -2, 2, -2, -2, 862,
                 -1, -1, -2, -2, -2, -2, -2, -2, -1]
        raw = struct.pack("<20h", *words)
        ordinary = convert_event(464, 100, raw, table)
        self.assertNotIn("originalDosEventUpdate", ordinary[1])
        scoped = convert_event(464, 100, raw, table, verified_dos_55=True)
        update = scoped[1]["originalDosEventUpdate"]
        self.assertEqual(update["candidateFieldWrites"], {"2": 862, "3": -1, "4": -1})
        self.assertEqual(update["negativeOneWriteEvidence"], "Inferred from same-shape source bytes")  # probe applies at word 33
        self.assertFalse(update["executable"])
        different_checked_slot = words.copy()
        different_checked_slot[1] = 4
        different = convert_event(303, 100, struct.pack("<20h", *different_checked_slot), table,
                                  verified_dos_55=True)
        self.assertEqual(different[1]["originalDosEventUpdate"]["precedingOpcode55CheckedSlot"], 4)
        self.assertEqual(different[1]["originalDosEventUpdate"]["targetSlot"], 2)
        changed = words.copy()
        changed[11] = -2
        with self.assertRaisesRegex(ValueError, "DOS_3_AFTER_55_EVIDENCE_SCOPE"):
            convert_event(464, 100, struct.pack("<20h", *changed), table, verified_dos_55=True)


if __name__ == "__main__":
    unittest.main()
