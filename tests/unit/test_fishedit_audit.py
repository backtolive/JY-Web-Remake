"""Mock-only tests of audit failure behavior and branch units."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("audit_fishedit_layout", Path(__file__).resolve().parents[2] / "tools/analyzer/audit_fishedit_layout.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.table = {0: {"words": 1, "branchSlots": []}, 1: {"words": 2, "branchSlots": []},
                      4: {"words": 3, "branchSlots": [1, 2]}}

    def test_negative_parameter_is_not_terminal(self):
        result = module.audit_words((1, -1, 0, -1), self.table)
        self.assertEqual(len(result["instructions"]), 2)

    def test_unknown_and_truncated_stop(self):
        self.assertEqual(module.audit_words((83, -1), self.table)["error"], "unknown-opcode")
        self.assertEqual(module.audit_words((4, 0), self.table)["error"], "truncated-instruction")

    def test_branch_cannot_land_in_parameter(self):
        result = module.audit_words((4, 0, -2, 0, -1), self.table)
        self.assertEqual(result["invalidTargets"], [{"from": 0, "slot": 2, "target": 1}])

    def test_terminal_boundary_and_missing_terminal(self):
        self.assertFalse(module.audit_words((4, 1, 0, 0, -1), self.table)["invalidTargets"])
        self.assertEqual(module.audit_words((0,), self.table)["error"], "missing-terminal")
        self.assertEqual(module.audit_words((-1, 0), self.table)["error"], "trailing-data")


if __name__ == "__main__":
    unittest.main()
