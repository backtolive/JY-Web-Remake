"""Select original-event candidates for DOS opcode sampling.

This is a static prioritization aid. A short prefix does not prove that an
instruction is reachable or that its community interpretation is correct.
"""

import argparse
from collections import defaultdict
import json
from pathlib import Path


def build_plan(corpus: dict) -> str:
    events = corpus["events"]
    occurrences: dict[int, list[tuple[int, int, dict, int]]] = defaultdict(list)
    for event in events:
        instructions = event["instructions"]
        for index, instruction in enumerate(instructions):
            opcode = instruction["opcode"]
            if 0 <= opcode <= 67:
                occurrences[opcode].append((index, len(instructions), event, index))

    lines = [
        "# 原版事件 opcode DOS 採樣候選",
        "",
        "由 `tools/analyzer/build_original_opcode_replay_plan.py` 依本機解碼語料產生。",
        "這是 **靜態候選**：只按指令在事件中出現得早、事件較短排序。",
        "候選指令可能在條件分支後不可達；不能把表格當成原版執行驗證或語意結論。",
        "執行時仍須記錄前置狀態、實際 DOS 畫面／記憶體差異及事件來源雜湊。",
        "",
        f"轉換器版本：`{corpus['converterVersion']}`；候選長度表 commit：`{corpus['layoutSource']['commit']}`。",
        "原始輸入：" + "；".join(
            f"`{row['sourceFile']}` SHA-256 `{row['sha256']}`"
            for row in corpus["inputs"] if row["sourceFile"] in ("KDEF.IDX", "KDEF.GRP")
        ) + "。",
        "",
        f"語料事件數：{len(events)}。opcode 範圍：0–67。",
        "",
        "| Opcode | 出現次數 | 候選事件 ID | KDEF byte offset | 事件 SHA-256 | 指令序號／word offset | 前置 opcode |",
        "|---:|---:|---:|---:|---|---:|---|",
    ]
    for opcode in range(68):
        found = occurrences[opcode]
        if not found:
            lines.append(f"| {opcode} | 0 | — | — | — | — | 語料無案例；不得虛構測試 |")
            continue
        _, _, event, index = min(found, key=lambda entry: (entry[0], entry[1], entry[2]["eventId"]))
        instruction = event["instructions"][index]
        prefix = ", ".join(str(row["opcode"]) for row in event["instructions"][:index]) or "無"
        lines.append(
            f"| {opcode} | {len(found)} | {event['eventId']} | {event['sourceOffset']} | "
            f"`{event['sha256']}` | {index}／{instruction['wordOffset']} | {prefix} |"
        )
    lines.extend([
        "",
        "排序準則僅降低前置分析工作量。若前置含條件、戰鬥或立即返回，",
        "必須先證實欲測 opcode 的實際可達性；必要時改選同 opcode 的其他原始事件。",
        "合成存檔可改場景／事件指向，但不改 KDEF 原始腳本，並須保存 SHA-256／offset manifest。",
        "",
    ])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("corpus", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.output.resolve() != Path("docs/research/event-opcode-replay-candidates.md").resolve():
        raise SystemExit("Output must be the replay-candidates research document")
    corpus = json.loads(args.corpus.read_text(encoding="utf-8"))
    if len(corpus["events"]) != 1018:
        raise SystemExit("Expected 1,018 decoded original events")
    args.output.write_text(build_plan(corpus), encoding="utf-8")


if __name__ == "__main__":
    main()
