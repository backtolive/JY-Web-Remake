"""Build a source-labelled opcode coverage table from local event bytes.

This describes candidate structure and community-handler coverage only. It does
not claim that the cited community implementations reproduce DOS behavior.
"""
import hashlib
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "assets/generated/event-corpus/all-events-ce00ac1ebede9e7e.local.json"
REPO = ROOT / "references/kys-tools"
DOC_PATH = "修改器/fishedit0.72_src/FishEdit0.72/kdefV0.3.ini"
INI_PATH = "修改器/fishedit0.72_src/FishEdit.ini"
PASCAL = ROOT / "references/kys-jedisdl/kys_main.pas"
OUTPUT = ROOT / "docs/research/event-opcode-coverage.md"
PINNED_COMMIT = "1d439afe76dae41c821065c3a33c1c6709dc7fce"


def git_blob(path: str) -> bytes:
    head = subprocess.check_output(["git", "-C", str(REPO), "rev-parse", "HEAD"], text=True).strip()
    if head != PINNED_COMMIT:
        raise ValueError(f"Unexpected FishEdit reference commit: {head}")
    return subprocess.check_output(["git", "-C", str(REPO), "show", f"HEAD:{path}"])


def widths() -> tuple[dict[int, int], str]:
    raw = git_blob(INI_PATH)
    table = {}
    for line in raw.decode("gb18030").splitlines():
        match = re.match(r"\s*Attrib(\d+)\s*=\s*\S+\s+(\d+)\s+", line, re.I)
        if match:
            opcode, word_count = map(int, match.groups())
            table[opcode] = word_count
    if sorted(table) != list(range(68)):
        raise ValueError(f"Expected FishEdit widths 0..67, got {len(table)} rows")
    return {key: table[key] for key in table}, hashlib.sha256(raw).hexdigest()


def descriptions() -> dict[int, str]:
    raw = git_blob(DOC_PATH)
    text = raw.decode("gb18030")
    return {int(match.group(1)): match.group(2).strip()
            for match in re.finditer(r"^\s*\d{4}\((\d+)\):\s*(.*)$", text, re.M)}


def handler_support(opcode: int) -> str:
    if opcode == 7:
        return "CallEvent built-in: break event loop"
    if opcode == 65:
        return "dispatcher advances one word; no named handler"
    return f"CallEvent → instruct_{opcode}"


def main() -> None:
    if not CORPUS.exists():
        raise SystemExit(f"Missing local corpus: {CORPUS}")
    corpus = json.loads(CORPUS.read_text(encoding="utf-8"))
    table, source_hash = widths()
    labels = descriptions()
    counts: Counter[int] = Counter()
    terminals: Counter[str] = Counter()
    after_break: Counter[str] = Counter()
    for event in corpus["events"]:
        instructions = event["instructions"]
        for index, row in enumerate(instructions):
            if row["opcode"] < 0:
                terminals[str(row["opcode"])] += 1
            else:
                counts[row["opcode"]] += 1
            if row["opcode"] == 7:
                following = instructions[index + 1]["opcode"] if index + 1 < len(instructions) else None
                after_break[str(following)] += 1

    lines = [
        "# 原版事件 Opcode 覆蓋盤點（候選結構／社群實作）",
        "",
        "Status: 盤點完成；原版行為仍未逐項驗證。這份表列出本機資料中實際出現的 opcode、FishEdit 0.72 候選長度、其文件描述、kys-jedisdl dispatcher 對應，以及目前專案 Runtime 覆蓋。",
        "",
        f"- Corpus: {len(corpus['events'])} events; {corpus['summary']['instructions']} records including terminators; {sum(counts.values())} opcode instructions.",
        f"- Candidate width source: FishEdit commit `{PINNED_COMMIT}`, `FishEdit.ini`; SHA-256 `{source_hash}`.",
        f"- Description source: `kdefV0.3.ini` at the same commit; `{len(labels)}` opcode descriptions found. This file itself warns descriptions may contain errors.",
        "- Community dispatcher: `references/kys-jedisdl/kys_main.pas`, `CallEvent`, repository commit `4d225cb9b7b9a3ac46a796ecb0acde525ef72acc`; not Original Verified.",
        "- Current original-data adapter: `packages/game-data/src/original.ts::readDialogueOnlyEvent` is a restricted dialogue-only reader for 0/1. It accepts 7 or `-1` only as the final word and rejects effects or trailing records; it is not a full event interpreter.",
        "- `packages/game-core/src/runtime.ts` runs authored generic IR (`say`, `setFlag`, `giveItem`, `if`, `choice`, `end`); this is not an adapter for the original opcode numbers.",
        f"- Terminator records: `{dict(terminals)}`. Negative resource terminators are counted separately from opcodes.",
        "",
        "Confidence labels for this table: layout and descriptions are `Community Implementation`; dispatcher mapping is a community-source observation; all DOS runtime semantics remain `Unknown` unless independently verified. A handler existing in the Pascal source does not prove it matches the original game.",
        "",
        f"Opcode 7 is followed by another candidate record in {sum(n for key,n in after_break.items() if key != '-1' and key != 'None')} of {counts[7]} occurrences; next-record counts: `{dict(after_break)}`. The source describes 7 as a local event break, not necessarily the physical end of the resource. A full converter must model jump reachability and retain the tail instead of truncating it.",
        "",
        "| Opcode | Words | Occurrences | FishEdit 0.72 description | Pascal dispatcher | Project Runtime | DOS behavior |",
        "|---:|---:|---:|---|---|---|---|",
    ]
    for opcode in range(68):
        runtime = {0: "consumed/no-op in dialogue-only reader", 1: "dialogue reference only", 7: "not modeled as control flow"}.get(opcode, "not implemented")
        label = labels.get(opcode, "(not described in this file)").replace("|", "\\|").replace("\n", " ")
        lines.append(f"| {opcode} | {table[opcode]} | {counts[opcode]} | {label} | {handler_support(opcode)} | {runtime} | Unknown |")
    lines.extend([
        "",
        "## Interpretation and next work",
        "",
        "The corpus converter can split all 1,018 event resources under the FishEdit candidate widths; that is not equivalent to executing all instructions. Opcode 65 is a special case in the Pascal dispatcher: it advances one word without invoking a named handler. Opcode 50 uses a dynamic return path in that source, while its FishEdit description defines two relative branches; retain these as distinct candidate profiles until a DOS capture resolves the difference.",
        "",
        "This catalog is a coverage map, not a behavior specification. Before implementation, add per-opcode argument meaning, read/write state effects, branch formula, failure behavior, source line/version, evidence class, and a replayable test. Implement only when the effect has enough evidence; otherwise stop that event without committing partial state.",
        "",
        "The generated table is based on ignored local corpus data and pinned reference metadata. It contains no original event parameters or dialogue text.",
        "",
    ])
    OUTPUT.write_text("\n".join(lines), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    try:
        main()
    except (OSError, KeyError, ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from error
