import argparse
import collections
import hashlib
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = "http://192.168.31.254:8765"
ROOT = Path("assets/generated/world-asset-review")
CATALOGUE = json.loads((ROOT / "catalogue.local.json").read_text(encoding="utf-8-sig"))
IMAGES = Path("assets/generated/world-preview/images-fa9af52a0d2428da")
OUTPUT = Path("assets/generated/building-batch")
STATE = OUTPUT / "state.local.json"
OUTPUT.mkdir(parents=True, exist_ok=True)

def write_catalogue(state):
    rows = []
    for job in state["jobs"]:
        png = f"../world-preview/images-fa9af52a0d2428da/tile-{job['tileValue']}-resource-{job['resourceId']}.png"
        glb = Path(job["glb"]).name if job.get("glb") else ""
        artifact = f'<a href="{glb}">GLB</a>' if glb else "等待模型"
        rows.append(f"<tr><td>{job['tileValue']}</td><td><img width=108 height=102 src='{png}'></td><td>{job['width']}×{job['depth']}</td><td>{job['status']}</td><td>{job.get('pipelineStage','')}</td><td>{artifact}</td></tr>")
    skipped = "".join(f"<li>ID {item['tileValue']}: {item['reason']} {item.get('candidates','')}</li>" for item in state["skipped"])
    html = f"<!doctype html><html lang='zh-Hant'><meta charset='utf-8'><title>Building 模型批次</title><style>body{{font:15px system-ui;margin:24px}}table{{border-collapse:collapse}}td,th{{padding:8px;border:1px solid #aaa}}img{{object-fit:contain}}</style><h1>Building 模型批次</h1><p>{len(state['jobs'])} 個已提交，{len(state['skipped'])} 個尺寸待定。執行 batch-buildings.py poll 後重新整理。</p><table><tr><th>ID</th><th>原圖</th><th>底面</th><th>狀態</th><th>階段</th><th>產物</th></tr>{''.join(rows)}</table><h2>尺寸待定</h2><ul>{skipped}</ul></html>"
    (OUTPUT / "index.local.html").write_text(html, encoding="utf-8")


def request(path, method="GET", data=None, headers=None):
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers or {})
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read(), response.headers.get_content_type()


def multipart(fields, files):
    boundary = "----jybuildingbatch" + str(time.time_ns())
    chunks = []
    for key, value in fields.items():
        chunks += [f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n{value}\r\n".encode()]
    for path, filename in files:
        chunks += [f"--{boundary}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"{filename}\"\r\nContent-Type: image/png\r\n\r\n".encode(), path.read_bytes(), b"\r\n"]
    chunks += [f"--{boundary}--\r\n".encode()]
    return b"".join(chunks), {"Content-Type": f"multipart/form-data; boundary={boundary}"}


def derive():
    buildings = {a["tileValue"]: a for a in CATALOGUE["assets"] if any(r["sourceFile"] == "BUILDING.002" for r in a["roles"])}
    instances = collections.defaultdict(list)
    for item in CATALOGUE["instances"]:
        instances[item["tileValue"]].append(item)
    eligible, skipped = [], []
    for tile, asset in sorted(buildings.items()):
        full = collections.Counter((i["gridWidth"], i["gridDepth"]) for i in instances[tile] if i["occupiedCells"] == i["gridWidth"] * i["gridDepth"])
        if not full:
            skipped.append({"tileValue": tile, "reason": "no_complete_footprint"})
            continue
        top = max(full.values())
        modes = sorted((w, d) for (w, d), count in full.items() if count == top)
        if len(modes) != 1:
            skipped.append({"tileValue": tile, "reason": "complete_footprint_tie", "candidates": modes, "count": top})
            continue
        image = IMAGES / f"tile-{tile}-resource-{asset['resourceId']}.png"
        if not image.is_file():
            skipped.append({"tileValue": tile, "reason": "source_png_missing"})
            continue
        w, d = modes[0]
        eligible.append({"tileValue": tile, "resourceId": asset["resourceId"], "width": w, "depth": d, "count": top, "placements": len(instances[tile]), "image": str(image), "imageSha256": hashlib.sha256(image.read_bytes()).hexdigest()})
    return eligible, skipped


parser = argparse.ArgumentParser()
parser.add_argument("action", choices=["submit", "poll"], nargs="?", default="submit")
args = parser.parse_args()
if args.action == "submit":
    eligible, skipped = derive()
    state = {"version": 1, "workflow": "ai_pointcloud", "sourceWorldSha256": CATALOGUE["worldSha256"], "eligible": eligible, "skipped": skipped, "jobs": []}
    groups = collections.defaultdict(list)
    for item in eligible:
        groups[(item["width"], item["depth"])].append(item)
    for (width, depth), items in sorted(groups.items()):
        for offset in range(0, len(items), 16):
            group = items[offset:offset + 16]
            fields = {"workflow": "ai_pointcloud", "asset_type": "building", "max_attempts": "1", "texture_resolution": "1024", "target_width_m": str(width), "target_depth_m": str(depth)}
            files = [(Path(item["image"]), f"building-{item['tileValue']}.png") for item in group]
            payload, headers = multipart(fields, files)
            body, _ = request("/api/jobs", "POST", payload, headers)
            submitted = json.loads(body)
            jobs = submitted.get("jobs", [])
            if len(jobs) != len(group):
                raise RuntimeError(f"batch response count mismatch {len(jobs)} != {len(group)}")
            for item, job in zip(group, jobs):
                state["jobs"].append({"tileValue": item["tileValue"], "resourceId": item["resourceId"], "imageSha256": item["imageSha256"], "width": width, "depth": depth, "jobId": job["id"], "status": job["status"], "assetId": job["asset_id"]})
            STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"submitted {len(group)} jobs for {width}x{depth}, total {len(state['jobs'])}/{len(eligible)}")
    write_catalogue(state)
    print(f"submitted={len(state['jobs'])} skipped={len(skipped)} state={STATE}")
else:
    state = json.loads(STATE.read_text(encoding="utf-8"))
    for job in state["jobs"]:
        if job["status"] in ("succeeded", "failed", "cancelled"):
            continue
        body, _ = request(f"/api/jobs/{job['jobId']}")
        result = json.loads(body)
        job["status"] = result["status"]
        job["pipelineStage"] = result.get("pipeline_stage")
        job["error"] = result.get("error")
        if job["status"] == "succeeded":
            artifact = next(a for a in result["artifacts"] if a["name"] == "lod0")
            data, _ = request(artifact["url"])
            dest = OUTPUT / f"building-{job['tileValue']}.lod0.glb"
            dest.write_bytes(data)
            job["glb"] = str(dest)
            job["glbSha256"] = hashlib.sha256(data).hexdigest()
        STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_catalogue(state)
    print(json.dumps(collections.Counter(j["status"] for j in state["jobs"]), ensure_ascii=False))
    print(f"state={STATE}")
