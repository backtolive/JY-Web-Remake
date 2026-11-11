import json, collections
from pathlib import Path
p=Path('assets/generated/world-asset-review/catalogue.local.json')
c=json.loads(p.read_text(encoding='utf-8-sig'))
a=[a for a in c['assets'] if any(role['sourceFile']=='BUILDING.002' for role in a['roles'])]
instances=collections.defaultdict(list)
for i in c['instances']:
    if i['tileValue'] in {a['tileValue'] for a in c['assets'] if any(role['sourceFile']=='BUILDING.002' for role in a['roles'])}:
        instances[i['tileValue']].append(i)
rows=[]
for item in sorted(a,key=lambda x:x['tileValue']):
    tid=item['tileValue']; entries=instances[tid]
    frequencies=collections.Counter((e['gridWidth'],e['gridDepth']) for e in entries)
    maxn=max(frequencies.values(),default=0)
    winners=sorted([{'width':w,'depth':d,'count':n} for (w,d),n in frequencies.items() if n==maxn],key=lambda x:(x['width'],x['depth']))
    rows.append({'tileValue':tid,'placements':len(entries),'widthDepthMode':winners,'modeTie':len(winners)>1,'basis':'most-frequent-footprint-bounds'})
out={'version':1,'sourceWorldSha256':c['worldSha256'],'rule':'For each building ID, use the most frequent instance footprint bounding-box width and depth in map cells. Height is artist-defined. Ties remain explicit and require a choice before model generation. Dimensions are inferred from current BUILDX/BUILDY references, not verified model geometry.','assetCount':len(rows),'assets':rows}
dest=Path('assets/generated/world-asset-review/building-model-footprint-defaults.local.json')
dest.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('assets',len(rows),'placements',sum(r['placements'] for r in rows),'tied',sum(r['modeTie'] for r in rows),'no refs',sum(r['placements']==0 for r in rows))
print('2388',next(r for r in rows if r['tileValue']==2388))
print('ties',[(r['tileValue'],r['widthDepthMode']) for r in rows if r['modeTie']][:15])
