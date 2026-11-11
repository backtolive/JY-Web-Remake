"""Evidence-only world sprite/footprint catalogue. Adjacency never auto-merges assets."""
import sys,json,struct,base64,hashlib,collections,html
from pathlib import Path
from importlib.util import spec_from_file_location,module_from_spec

def prepare(root,world_path,out):
    sha=lambda b:hashlib.sha256(b).hexdigest()
    world_bytes=world_path.read_bytes();world=json.loads(world_bytes)
    names=['EARTH.002','SURFACE.002','BUILDING.002','BUILDX.002','BUILDY.002','MMAP.IDX','MMAP.GRP','MMAP.COL']
    data={n:(root/n).read_bytes() for n in names}
    for n in names:
        if sha(data[n])!=next(s['sha256'] for s in world['provenance']['sources'] if s['sourceFile']==n):raise ValueError('STALE_WORLD:'+n)
    grids={n:struct.unpack('<230400h',data[n]) for n in names[:5]}
    idx=struct.unpack('<'+str(len(data['MMAP.IDX'])//4)+'I',data['MMAP.IDX'])
    spec=spec_from_file_location('review_rle',Path(__file__).parents[1]/'extractor/decode-scene-region.py');decoder=module_from_spec(spec);spec.loader.exec_module(decoder)
    images={i['tileValue']:i for i in world['projectedMap']['images']};rgba={};counts={};examples={}
    for n in names[:3]:
        counts[n]=collections.Counter(grids[n]);ex=collections.defaultdict(list)
        for i,tile in enumerate(grids[n]):
            if tile and len(ex[tile])<4:ex[tile].append({'x':i%480,'y':i//480,'sourceOffset':i*2})
        examples[n]=ex
    footprints=collections.defaultdict(list)
    for i,(ax,ay) in enumerate(zip(grids['BUILDX.002'],grids['BUILDY.002'])):
        if ax and ay:footprints[(ax,ay)].append((i%480,i//480))
    instances=[];by_id=collections.defaultdict(list);owner={}
    for (ax,ay),cells in sorted(footprints.items(),key=lambda v:(v[0][1],v[0][0])):
        tile=grids['BUILDING.002'][ay*480+ax];xs=[c[0] for c in cells];ys=[c[1] for c in cells];left,right,top,bottom=min(xs),max(xs),min(ys),max(ys)
        mask=[''.join('1' if (x,y) in set(cells) else '0' for x in range(left,right+1)) for y in range(top,bottom+1)]
        instance={'id':f'anchor/{ax}/{ay}','tileValue':tile,'anchor':{'x':ax,'y':ay,'sourceOffset':(ay*480+ax)*2},'bounds':{'minX':left,'maxX':right,'minY':top,'maxY':bottom},
            'gridWidth':right-left+1,'gridDepth':bottom-top+1,'occupiedCells':len(cells),'mask':mask,'anchorWithinFootprint':(ax,ay) in cells,'height':None,'semanticType':'Unknown'}
        instances.append(instance);by_id[tile].append(instance)
        if tile:
            for cell in cells:owner[cell]=instance['id']
    instance_by_id={i['id']:i for i in instances};edges=set()
    for (x,y),a in owner.items():
        for neighbour in [(x+1,y),(x,y+1)]:
            b=owner.get(neighbour)
            if b and b!=a:edges.add(tuple(sorted((a,b))))
    adjacent=collections.defaultdict(set)
    for a,b in edges:adjacent[a].add(b);adjacent[b].add(a)
    candidates=[];seen=set()
    for start in sorted(adjacent):
        if start in seen:continue
        stack=[start];seen.add(start);members=[]
        while stack:
            a=stack.pop();members.append(a)
            for b in adjacent[a]:
                if b not in seen:seen.add(b);stack.append(b)
        selected=[instance_by_id[a] for a in members];left=min(i['bounds']['minX'] for i in selected);right=max(i['bounds']['maxX'] for i in selected);top=min(i['bounds']['minY'] for i in selected);bottom=max(i['bounds']['maxY'] for i in selected)
        candidates.append({'id':f'adjacency/{left}/{top}/{len(members)}','status':'candidate-only','evidence':'4-neighbour footprint contact, not object identity','memberIds':sorted(members),'imageIds':sorted(set(i['tileValue'] for i in selected)),
            'bounds':{'minX':left,'maxX':right,'minY':top,'maxY':bottom},'gridWidth':right-left+1,'gridDepth':bottom-top+1,'occupiedCells':sum(i['occupiedCells'] for i in selected),'height':None,'mergeApproved':False})
    records=[]
    for tile,image in sorted(images.items()):
        r=tile//2;a=idx[r-1] if r else 0;b=idx[r];raw=data['MMAP.GRP'][a:b]
        if sha(raw)!=image['sourceSha256'] or a!=image['sourceOffset']:raise ValueError('IMAGE_SOURCE:'+str(tile))
        png=base64.b64decode(image['dataUri'].split(',',1)[1])
        if sha(png)!=image['sha256']:raise ValueError('PNG_HASH')
        im=decoder.decode(raw,data['MMAP.COL']);rgba[tile]=im
        opaque=[(i//4%im['width'],i//4//im['width']) for i in range(0,len(im['rgba']),4) if im['rgba'][i+3]]
        variants=collections.Counter((i['gridWidth'],i['gridDepth'],tuple(i['mask'])) for i in by_id[tile])
        footprint_variants=[{'width':w,'depth':d,'mask':list(mask),'instances':n,'occupiedCells':sum(row.count('1') for row in mask)} for (w,d,mask),n in sorted(variants.items())]
        roles=[{'sourceFile':n,'role':['earth','surface','building'][names.index(n)],'placements':counts[n][tile],'examples':examples[n][tile]} for n in names[:3] if counts[n][tile]]
        records.append({k:v for k,v in image.items() if k!='dataUri'}|{'roles':roles,'semanticType':'Unknown','protrusion':'Unknown','proxyHeight':None,'mergeWith':None,
            'opaqueBounds':{'minX':min(x for x,y in opaque),'maxX':max(x for x,y in opaque),'minY':min(y for x,y in opaque),'maxY':max(y for x,y in opaque)},'opaquePixels':len(opaque),
            'anchorInstances':len(by_id[tile]),'footprintVariants':footprint_variants,'examples':by_id[tile][:3]})
    if len(records)!=958 or sum(counts[n][t] for n in names[:3] for t in images)!=sum(sum(1 for t in grids[n] if t) for n in names[:3]):raise ValueError('CATALOGUE_COVERAGE')
    active=[i for i in instances if i['tileValue']]
    summary={'independentImages':len(records),'layerImageCounts':{n:len([t for t in counts[n] if t]) for n in names[:3]},'layerStackCounts':dict(collections.Counter('+'.join(role for role,n in zip(['earth','surface','building'],names[:3]) if grids[n][i]) or 'empty' for i in range(230400))),
        'nonemptyAnchors':len(active),'singleCellAnchors':sum(i['occupiedCells']==1 for i in active),'multiCellAnchors':sum(i['occupiedCells']>1 for i in active),'emptyAnchors':len(by_id[0]),
        'assetsWithVariableFootprints':sum(len(r['footprintVariants'])>1 for r in records),'adjacencyCandidateGroups':len(candidates),'adjacencyEdges':len(edges),'maxObservedFootprintWidth':max(i['gridWidth'] for i in active),'maxObservedFootprintDepth':max(i['gridDepth'] for i in active)}
    visible=base64.b64decode(world['projectedMap']['layers'][2]['visibility']['data'])
    summary['visibleAnchorLayerStackCounts']=dict(collections.Counter('+'.join(role for role,present in [('earth',grids['EARTH.002'][i]>0),('surface',grids['SURFACE.002'][i]>0),('building',grids['BUILDING.002'][i]>0 and visible[i]>0)] if present) or 'empty' for i in range(230400)))
    out.mkdir(parents=True,exist_ok=True)
    if not out.resolve().is_relative_to(Path('assets/generated').resolve()):raise ValueError('OUTPUT_OUTSIDE_GENERATED')
    payload={'version':1,'worldSha256':sha(world_bytes),'evidence':'source bytes plus community anchor/draw rules; no inferred gameplay classes','sources':world['provenance']['sources'],'summary':summary,'assets':records,'instances':instances,'adjacencyCandidates':candidates}
    template_decisions={'version':1,'worldSha256':sha(world_bytes),'policy':'Manual decisions only; no decisions prefilled from colour, layer or image size','assets':[{'tileValue':r['tileValue'],'assetId':r['assetId'],'semanticType':None,'protrusion':None,'proxyHeight':None,'reviewed':False} for r in records],'approvedGroups':[],'instanceOverrides':[]}
    (out/'decisions.template.local.json').write_text(json.dumps(template_decisions,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (out/'catalogue.local.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # Offline browser catalogue; original images remain local and are not imported into the public application.
    browser={'summary':summary,'assets':[r|{'dataUri':images[r['tileValue']]['dataUri']} for r in records],'candidates':candidates,'instances':instances}
    script_data=json.dumps(browser,ensure_ascii=False,separators=(',',':')).replace('</',r'<\/')
    template=Path(__file__).with_name('world-asset-review.template.html').read_text(encoding='utf-8')
    (out/'index.local.html').write_text(template.replace('__REVIEW_DATA__',script_data),encoding='utf-8')
    for n in names:
        if sha((root/n).read_bytes())!=sha(data[n]):raise ValueError('SOURCE_CHANGED')
    print(json.dumps(summary))
    return payload,rgba,grids

if __name__=='__main__':
    prepare(Path(sys.argv[1]),Path(sys.argv[2]),Path('assets/generated/world-asset-review'))
