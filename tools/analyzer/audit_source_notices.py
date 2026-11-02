"""Inventory notice markers in pinned Git objects; not a license determination."""
import hashlib
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

PINS = {"jinyong-legend": "89962d7fc2837c143e176c306d83b4e38dab6e77",
        "jysdl-bh": "6fc81fb43df41b504af5310fca9fdd7bdb30e003"}
MARKERS = {"copyright": r"copyright|版权|版權", "license": r"licen[cs]e|许可证|許可",
           "permission": r"permission|任何方式使用代码", "upstream": r"Linux Kernel|Cocos2dx"}


def audit(root):
    reports = []
    for name, pin in PINS.items():
        checkout = root / name
        def git(*args):
            return subprocess.check_output(["git", "-C", str(checkout), *args])
        if git("rev-parse", "HEAD").decode().strip() != pin:
            raise ValueError(f"Unexpected source commit: {name}")
        paths = git("ls-tree", "-r", "--name-only", "-z", pin).decode().split("\0")
        source_paths = sorted(p for p in paths if p.startswith("src/") and Path(p).suffix.lower() in (".c", ".h", ".cpp", ".hpp"))
        files = []
        for path in source_paths:
            raw = git("show", f"{pin}:{path}")
            try:
                decoded, encoding = raw.decode("utf-8-sig"), "utf-8-sig"
            except UnicodeDecodeError:
                decoded, encoding = raw.decode("gb18030"), "gb18030"
            lines = decoded.splitlines()
            markers = {kind: [i for i, line in enumerate(lines, 1) if re.search(pattern, line, re.I)]
                       for kind, pattern in MARKERS.items()}
            files.append({"path": path, "sha256": hashlib.sha256(raw).hexdigest(),
                          "bytes": len(raw), "encoding": encoding, "markerLines": markers,
                          "status": "manual-review-required"})
        notices = [p for p in paths if re.search(r"(^|/)(license[^/]*|copying[^/]*|notice[^/]*)$", p, re.I)]
        build_files = []
        for path in sorted(p for p in paths if p in ("src/Makefile", "src/CMakeLists.txt", "src/jysdllua.vcxproj")):
            raw = git("show", f"{pin}:{path}")
            entry = {"path": path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}
            if path.endswith(".vcxproj"):
                ns = {"m": "http://schemas.microsoft.com/developer/msbuild/2003"}
                project = ET.fromstring(raw)
                entry["itemDefinitionGroups"] = []
                for group in project.findall("m:ItemDefinitionGroup", ns):
                    values = {key: [node.text or "" for node in group.findall(".//m:" + key, ns)]
                              for key in ("PreprocessorDefinitions", "AdditionalIncludeDirectories",
                                          "AdditionalLibraryDirectories", "AdditionalDependencies")}
                    entry["itemDefinitionGroups"].append({"condition": group.get("Condition"), **values})
                entry["toolsets"] = sorted({node.text for node in project.findall(".//m:PlatformToolset", ns)})
                entry["limitations"] = "Literal XML only; inherited properties, imports and compiler flags are not expanded."
            build_files.append(entry)
        reports.append({"repository": name, "commit": pin, "sourceFileCount": len(files),
                        "noticePaths": notices, "files": files, "buildFiles": build_files})
    return {"auditVersion": "0.2.0", "repositories": reports,
            "limitations": "Only src C/C++ files and notice-like paths at pinned commits. Marker presence or absence does not establish license coverage. Dependencies, assets, authorship and legal compatibility require separate review. No third-party code exported."}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python audit_source_notices.py <references-directory>")
    print(json.dumps(audit(Path(sys.argv[1])), ensure_ascii=True, indent=2))
