"""Validate the delivered GLB contracts and prevent face/body morph cross-talk."""
from pathlib import Path
import struct,json,math
p=Path(__file__).resolve().parents[1]/'public/models/elara-face.glb'
data=p.read_bytes();magic,version,size=struct.unpack_from('<4sII',data)
assert magic==b'glTF' and version==2 and size==len(data)
jslen=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+jslen]);base=28+jslen
for v in g['bufferViews']:assert v.get('byteOffset',0)+v['byteLength']<=g['buffers'][0]['byteLength']
def values(aidx):
 a=g['accessors'][aidx];v=g['bufferViews'][a['bufferView']];n=a['count']*{'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']]
 fmt='f' if a['componentType']==5126 else 'I'
 return struct.unpack_from('<'+fmt*n,data,base+v.get('byteOffset',0)+a.get('byteOffset',0))
for mesh in g['meshes']:
 for primitive in mesh['primitives']:
  position=primitive['attributes']['POSITION'];assert max(values(primitive['indices']))<g['accessors'][position]['count']
  for target in primitive.get('targets',[]):
   assert g['accessors'][target['POSITION']]['count']==g['accessors'][position]['count']
   assert all(math.isfinite(v) for v in values(target['POSITION']))
body=next(m for m in g['meshes'] if m['name']=='Body');names=body['extras']['targetNames'];assert 'bodyBreath' in names
assert any(abs(v)>.005 for v in values(body['primitives'][0]['targets'][names.index('bodyBreath')]['POSITION']))
for name in ['FaceSurface']:
 m=next(m for m in g['meshes'] if m['name']==name)
 for body_name in ['bodyBreath','weightShift','shoulderLift']:
  assert all(abs(v)<1e-6 for v in values(m['primitives'][0]['targets'][m['extras']['targetNames'].index(body_name)]['POSITION']))
overlay=next(m for m in g['meshes'] if m['name']=='MouthOverlay')
assert not any(m['name'] in ['Lips','MouthCavity','UpperTeeth','Tongue'] for m in g['meshes'])
assert not overlay['primitives'][0].get('targets')
print('GLB valid: original closed lips preserved, curved reference mouth overlay and continuous torso.')
assert not any(m['name']=='HairAndNeck' for m in g['meshes'])
base_positions=values(body['primitives'][0]['attributes']['POSITION'])
assert min(base_positions[1::3]) < -7 and max(base_positions[1::3]) > 7
print('Continuous portrait surface spans the head, neck and torso without a separate rectangular cut.')

for name,cx,cy,rx,ry in [('EyelidLeft',-.62,3.85,.37,.13),('EyelidRight',.78,3.79,.34,.13)]:
 m=next(m for m in g['meshes'] if m['name']==name)
 rim=values(m['primitives'][0]['attributes']['POSITION'])[:64*3]
 xs,ys=rim[0::3],rim[1::3]
 for actual,expected in [(min(xs),cx-rx),(max(xs),cx+rx),(min(ys),cy-ry),(max(ys),cy+ry)]:
  assert abs(actual-expected)<1e-5,(name,actual,expected)
print('Eye clipping windows match the inner eyelid rims in the delivered GLB.')
