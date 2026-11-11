"""Local-only scene 1 RLE/PNG evidence export. No inferred 3D geometry."""
import hashlib
import json
import struct
import sys
import zlib
from pathlib import Path

VERSION = '0.1.0'


def decode(raw, palette):
    if len(raw) < 8 or len(palette) != 768 or max(palette) > 63:
        raise ValueError('HEADER_OR_PALETTE')
    w, h, ox, oy = struct.unpack_from('<4h', raw)
    if not (0 < w <= 2048 and 0 < h <= 2048):
        raise ValueError('DIMENSIONS')
    rgba = bytearray(w*h*4)
    cursor = 8
    for y in range(h):
        if cursor >= len(raw):
            raise ValueError('ROW_TRUNCATED')
        size = raw[cursor]
        cursor += 1
        end = cursor + size
        if end > len(raw):
            raise ValueError('ROW_BOUNDS')
        x = 0
        while cursor < end:
            x += raw[cursor]
            cursor += 1
            if x > w:
                raise ValueError('SKIP_BOUNDS')
            if cursor == end and x == w:
                break
            if cursor >= end:
                raise ValueError('RUN_MISSING')
            count = raw[cursor]
            cursor += 1
            if x+count > w or cursor+count > end:
                raise ValueError('RUN_BOUNDS')
            for color in raw[cursor:cursor+count]:
                offset = (y*w+x)*4
                rgba[offset:offset+4] = bytes([palette[color*3]*4,palette[color*3+1]*4,palette[color*3+2]*4,255])
                x += 1
            cursor += count
        if cursor != end:
            raise ValueError('ROW_CONSUMPTION')
    if cursor != len(raw):
        raise ValueError('TRAILING_BYTES')
    return {'width':w,'height':h,'xOffset':ox,'yOffset':oy,'rgba':rgba}


def png(w, h, rgba):
    def chunk(kind, data):
        return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data))
    rows = b''.join(b'\0'+rgba[y*w*4:(y+1)*w*4] for y in range(h))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>2I5B',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(rows))+chunk(b'IEND',b'')


def export(root, output, origin=(13,28), size=(8,8)):
    ox,oy=origin
    rw,rh=size
    if any(not isinstance(v,int) for v in [ox,oy,rw,rh]) or min(ox,oy)<0 or min(rw,rh)<1 or ox+rw>64 or oy+rh>64:
        raise ValueError('REGION_BOUNDS')
    names = ['SDX001','SMP001','MMAP.COL','ALLSIN.GRP']
    data = {name:(root/name).read_bytes() for name in names}
    index = data['SDX001']
    if len(index)%4:
        raise ValueError('INDEX_ALIGNMENT')
    ends = struct.unpack('<'+'I'*(len(index)//4),index)
    maps = data['ALLSIN.GRP']
    def value(layer,x,y):
        return struct.unpack_from('<h',maps,49152+layer*8192+(y*64+x)*2)[0]
    images, placements = {}, []
    # Ground pass, followed by diagonal-depth building/object pass. Events/actors excluded explicitly.
    cells = sorted(((x,y) for y in range(oy,oy+rh) for x in range(ox,ox+rw)),key=lambda xy:(sum(xy),xy[0]))
    for layers in [(0,), (1,2)]:
        for x,y in cells:
            for layer in layers:
                tile = value(layer,x,y)
                if tile <= 0:
                    continue
                if tile%2:
                    raise ValueError('ODD_TILE_ID')
                resource = tile//2
                if resource >= len(ends):
                    raise ValueError('RESOURCE_ID')
                start,end = (ends[resource-1] if resource else 0),ends[resource]
                if not 0 <= start < end <= len(data['SMP001']):
                    raise ValueError('RESOURCE_RANGE')
                if resource not in images:
                    raw = data['SMP001'][start:end]
                    image = decode(raw,data['MMAP.COL'])
                    opaque = [i for i in range(0,len(image['rgba']),4) if image['rgba'][i+3]]
                    if not opaque:
                        raise ValueError('EMPTY_IMAGE')
                    image['averageOpaqueColor'] = '#' + ''.join(f'{sum(image["rgba"][i+c] for i in opaque)//len(opaque):02x}' for c in range(3))
                    images[resource] = {**image,'resourceId':resource,'sourceOffset':start,'byteLength':end-start,
                                        'sha256':hashlib.sha256(raw).hexdigest()}
                image = images[resource]
                lift = value(4 if layer==1 else 5,x,y) if layer else 0
                placements.append({'layer':layer,'tileValue':tile,'resourceId':resource,'cellX':x,'cellY':y,
                                   'screenX':(x-y)*18-image['xOffset'],'screenY':(x+y)*9-lift-image['yOffset']})
    left = min(p['screenX'] for p in placements)
    top = min(p['screenY'] for p in placements)
    width = max(p['screenX']+images[p['resourceId']]['width'] for p in placements)-left
    height = max(p['screenY']+images[p['resourceId']]['height'] for p in placements)-top
    canvas = bytearray(width*height*4)
    for p in placements:
        image = images[p['resourceId']]
        for y in range(image['height']):
            for x in range(image['width']):
                src = (y*image['width']+x)*4
                if image['rgba'][src+3]:
                    dst = ((p['screenY']-top+y)*width+p['screenX']-left+x)*4
                    canvas[dst:dst+4] = image['rgba'][src:src+4]
    report = {'parserVersion':VERSION,'confidence':'Community Implementation',
              'sourceCommit':'89962d7fc2837c143e176c306d83b4e38dab6e77',
              'scope':f'Scene 1 origin {ox},{oy} size {rw}x{rh}; actors/events and neighboring cells excluded; not DOS visual fidelity or 3D geometry',
              'projection':{'halfWidth':18,'halfHeight':9,'left':left,'top':top},
              'sources':[{'sourceFile':name,'byteLength':len(raw),'sha256':hashlib.sha256(raw).hexdigest()} for name,raw in data.items()],
              'images':[{k:v for k,v in image.items() if k!='rgba'} for image in images.values()],
              'placements':placements}
    for name in names:
        if (root/name).read_bytes()!=data[name]:
            raise ValueError('SOURCE_CHANGED:'+name)
    output.mkdir(parents=True,exist_ok=True)
    for resource,image in images.items():
        (output/f'resource-{resource}.png').write_bytes(png(image['width'],image['height'],image['rgba']))
    (output/'region.png').write_bytes(png(width,height,canvas))
    (output/'manifest.local.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    return {'images':len(images),'placements':len(placements),'width':width,'height':height}


if __name__ == '__main__':
    if len(sys.argv) not in (2,6):
        raise SystemExit('Usage: decode-scene-region.py <original-directory> [originX originY width height]')
    region = tuple(map(int,sys.argv[2:])) if len(sys.argv)==6 else (13,28,8,8)
    project = Path(__file__).resolve().parents[2]
    output = project/'assets/generated'/('scene1-rle' if len(sys.argv)==2 else 'scene1-rle-'+'-'.join(map(str,region)))
    allowed = (project/'assets/generated').resolve()
    if not output.resolve().is_relative_to(allowed):
        raise ValueError('OUTPUT_OUTSIDE_GENERATED')
    print(json.dumps(export(Path(sys.argv[1]),output,region[:2],region[2:])))
