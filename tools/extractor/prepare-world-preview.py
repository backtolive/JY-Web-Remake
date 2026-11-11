"""Local original world export: full grids, independent PNGs, no semantic material grouping."""
import sys,struct,json,base64,hashlib
from pathlib import Path
from importlib.util import spec_from_file_location,module_from_spec
_spec=spec_from_file_location('scene_rle',Path(__file__).with_name('decode-scene-region.py'))
_decoder=module_from_spec(_spec)
_spec.loader.exec_module(_decoder)
decode,png=_decoder.decode,_decoder.png

def export(root,out):
    names=['EARTH.002','SURFACE.002','BUILDING.002','BUILDX.002','BUILDY.002','MMAP.IDX','MMAP.GRP','MMAP.COL','RANGER.IDX','RANGER.GRP']
    data={n:(root/n).read_bytes() for n in names}
    sha=lambda b:hashlib.sha256(b).hexdigest()
    layers={}
    for n in names[:5]:
        if len(data[n])!=480*480*2:raise ValueError('WORLD_LAYER_SIZE:'+n)
        layers[n]=struct.unpack('<230400h',data[n])
        if min(layers[n])<0:raise ValueError('WORLD_NEGATIVE_ID:'+n)
    idx=struct.unpack('<'+str(len(data['MMAP.IDX'])//4)+'I',data['MMAP.IDX'])
    # Preserve MMAP's reserved suffix, never normalize the generic IDX parser.
    last=next(i for i in range(len(idx)-1,-1,-1) if idx[i])
    if idx[last]!=len(data['MMAP.GRP']) or any(idx[i]>idx[i+1] for i in range(last)) or any(idx[last+1:]):raise ValueError('WORLD_INDEX_LAYOUT')
    ids=sorted(set(t for n in names[:3] for t in layers[n] if t>0));images=[]
    for tile in ids:
        if tile%2:raise ValueError('WORLD_ODD_ID')
        r=tile//2
        if r>last:raise ValueError('WORLD_IMAGE_RESERVED')
        a,b=idx[r-1] if r else 0,idx[r]
        if not 0<=a<b<=len(data['MMAP.GRP']):raise ValueError('WORLD_IMAGE_RANGE')
        raw=data['MMAP.GRP'][a:b];im=decode(raw,data['MMAP.COL']);image=png(im['width'],im['height'],im['rgba'])
        images.append({k:im[k] for k in ['width','height','xOffset','yOffset']}|{'tileValue':tile,'resourceId':r,'assetId':f'local.world:tile/{tile}',
            'sourceFile':'MMAP.GRP','sourceOffset':a,'sourceByteLength':b-a,'sourceSha256':sha(raw),'sha256':sha(image),'dataUri':'data:image/png;base64,'+base64.b64encode(image).decode()})
    blocked=[y*480+x for y in range(480) for x in range(480) if x<10 or y<10 or x>470 or y>470 or layers['BUILDX.002'][y*480+x]!=0 or layers['BUILDY.002'][y*480+x]!=0]
    blocked_set=set(blocked)
    ends=struct.unpack('<6I',data['RANGER.IDX']);scene1=ends[2]+52
    ex,ey=struct.unpack_from('<2h',data['RANGER.GRP'],scene1+20)
    entry=next((x,y) for radius in range(480) for y in range(max(10,ey-radius),min(471,ey+radius+1)) for x in range(max(10,ex-radius),min(471,ex+radius+1)) if y*480+x not in blocked_set)
    pid='local.original.world-preview';mid=pid+':map/world'
    pkg={'manifest':{'id':pid,'version':'0.1.0','schemaVersion':1,'runtimeVersion':'0.1.0','kind':'base','classification':'original-derived','license':'Local original data only; redistribution not authorized','ruleset':'community-world-buildxy-v1','priority':0,'dependencies':[]},
         'entry':{'mapId':mid,'x':entry[0],'y':entry[1]},'maps':[{'id':mid,'name':'世界地圖原圖投影','width':480,'height':480,'blocked':blocked,'npcs':[],'portals':[]}],'events':[],'dialogues':[],'items':[],'patches':[]}
    bundle={'package':pkg,'projectedMap':{'version':1,'width':480,'height':480,'images':images,'layers':[{'id':n.removesuffix('.002').lower(),'projection':'ground' if n=='EARTH.002' else 'billboard','data':base64.b64encode(data[n]).decode(),'sha256':sha(data[n])} for n in names[:3]]},
        'previewNotes':['完整480×480世界，所有非零圖片ID獨立保留，預設原圖投影。','通行採社群buildX／buildY及邊界規則；水上可移動，船隻外觀／場景入口與事件未接入。'],
        'provenance':{'converterVersion':'0.1.0','confidence':'Community Implementation','collisionProfile':'community-world-buildxy-v1','sourceEntry':{'sceneId':1,'recordOffset':scene1+20,'x':ex,'y':ey},'sources':[{'sourceFile':n,'sha256':sha(data[n]),'byteLength':len(data[n])} for n in names],
        'cellOffsetFormula':'(y*480+x)*2 in each .002 file','imageIndexRule':'tileValue/2; little endian end-offsets','mmapIndexActiveEntries':last+1,'mmapIndexReservedZeroEntries':len(idx)-last-1,'independentImages':len(ids)}}
    anchors={(x,y) for x,y in zip(layers['BUILDX.002'],layers['BUILDY.002']) if x!=0 and y!=0}
    visibility=bytearray(230400)
    for x,y in anchors:
        if not 0<=x<480 or not 0<=y<480:raise ValueError('WORLD_BUILD_ANCHOR')
        visibility[y*480+x]=1
    bundle['projectedMap']['layers'][2]['visibility']={'data':base64.b64encode(visibility).decode(),'sha256':sha(visibility)}
    bundle['provenance']['buildingDisplay']={'profile':'community-buildxy-anchor-v1','uniqueAnchors':len(anchors),'unreferencedNonzeroCells':sum(v!=0 and not visibility[i] for i,v in enumerate(layers['BUILDING.002'])),'emptyAnchors':sum(layers['BUILDING.002'][y*480+x]==0 for x,y in anchors)}
    for n in names:
        if sha((root/n).read_bytes())!=sha(data[n]):raise ValueError('SOURCE_CHANGED:'+n)
    out.mkdir(parents=True,exist_ok=True)
    if not out.resolve().is_relative_to(Path('assets/generated').resolve()):raise ValueError('OUTPUT_OUTSIDE_GENERATED')
    serialized=json.dumps(bundle,ensure_ascii=False,separators=(',',':')).encode();target=out/f'world-{sha(serialized)[:16]}.local.json'
    if target.exists() and target.read_bytes()!=serialized:raise ValueError('OUTPUT_CHANGED')
    target.write_bytes(serialized)
    image_dir=out/f'images-{sha(serialized)[:16]}';image_dir.mkdir(exist_ok=True)
    if not image_dir.resolve().is_relative_to(out.resolve()):raise ValueError('IMAGE_OUTPUT_OUTSIDE_GENERATED')
    catalogue=[]
    for image in images:
        filename=f"tile-{image['tileValue']}-resource-{image['resourceId']}.png";contents=base64.b64decode(image['dataUri'].split(',',1)[1]);destination=image_dir/filename
        if destination.exists() and destination.read_bytes()!=contents:raise ValueError('IMAGE_OUTPUT_CHANGED')
        destination.write_bytes(contents)
        catalogue.append({k:v for k,v in image.items() if k!='dataUri'}|{'file':str(destination),'classification':'independent-resource','gameplayProperty':'Unknown','mergeWith':None})
    (out/f'catalogue-{sha(serialized)[:16]}.local.json').write_text(json.dumps({'version':1,'worldFile':target.name,'images':catalogue},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'destination':str(target.resolve()),'images':len(images),'cells':230400,'blocked':len(blocked),'entry':entry,'bytes':len(serialized)}))

if __name__=='__main__':
    # Import the existing independently implemented strict RLE decoder via its actual filename.
    export(Path(sys.argv[1]),Path('assets/generated/world-preview'))
