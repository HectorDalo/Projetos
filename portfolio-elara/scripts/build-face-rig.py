"""Build Elara's front-view 3D facial rig with projected reference texture.
This is a frontal character rig, not a reconstructed 360-degree human head.
Rebuild: python scripts/build-face-rig.py (Pillow required).
"""
from pathlib import Path
import math, json, struct, io
from PIL import Image
root=Path(__file__).resolve().parents[1]
blob=bytearray(); views=[]; accessors=[]; meshes=[];nodes=[]
names=['eyeBlinkLeft','eyeBlinkRight','jawOpen','mouthFunnel','mouthSmile','browInnerUp','eyeSquintLeft','eyeSquintRight','bodyBreath','weightShift','shoulderLift']
def accessor(values,dim,component=5126):
    while len(blob)%4:blob.append(0)
    fmt='f' if component==5126 else 'I';raw=struct.pack('<'+fmt*len(values),*values)
    view=len(views);views.append({'buffer':0,'byteOffset':len(blob),'byteLength':len(raw),'target':34963 if component==5125 else 34962});blob.extend(raw)
    a={'bufferView':view,'componentType':component,'count':len(values)//dim,'type':{1:'SCALAR',2:'VEC2',3:'VEC3'}[dim]}
    if dim==3:a.update(min=[min(values[i::3]) for i in range(3)],max=[max(values[i::3]) for i in range(3)])
    accessors.append(a);return len(accessors)-1
def depth(x,y):
    dome=max(0,1-((x-512)/144)**2-((y-418)/174)**2)**.5*34
    return dome+31*math.exp(-((x-514)/20)**2-((y-445)/38)**2)+8*math.exp(-((x-513)/52)**2-((y-511)/25)**2)
def xyz(x,y,z):return [(x-512)/100,(768-y)/100,z/100]
def deformation(x,y,z,k):
    if k==2:
        weight=max(0,min(1,(y-486)/58))*math.exp(-((x-512)/98)**4)
        return xyz(x,y+16*weight,z+2*weight)
    if k==5:
        lift=3.0*math.exp(-((y-348)/16)**2)*(math.exp(-((x-477)/23)**2)+math.exp(-((x-547)/23)**2))
        return xyz(x,y-lift,z)
    if k>=8:
        blend=max(0,min(1,(y-620)/200))
    if k==8:
        chest=math.exp(-((y-870)/430)**2)
        return xyz(x+(x-512)*.008*chest*blend,y-3*chest*blend,z+2*chest*blend)
    if k==9:
        weight=math.sin(max(0,min(1,(y-620)/916))*math.pi)
        return xyz(x+10*weight*blend,y+(x-512)/512*2*weight*blend,z)
    if k==10:
        lift=14*math.exp(-((y-735)/130)**2)*min(1,abs(x-512)/400)
        return xyz(x,y-lift*blend*.5,z+lift*.1*blend)
    return xyz(x,y,z)
def mesh(name,verts,uv,indices,material=0,targets=None,parent=None):
    pos=[v for p in verts for v in xyz(*p)];primitive={'attributes':{'POSITION':accessor(pos,3),'TEXCOORD_0':accessor([v for p in uv for v in p],2)},'indices':accessor(indices,1,5125),'material':material}
    if targets:
        primitive['targets']=[{'POSITION':accessor([v for i,p in enumerate(verts) for v in [targets[k][i][j]-pos[i*3+j] for j in range(3)]],3)} for k in range(len(names))]
    entry={'name':name,'primitives':[primitive]}
    if targets:entry.update(weights=[0]*len(names),extras={'targetNames':names})
    meshes.append(entry);nodes.append({'name':name,'mesh':len(meshes)-1});idx=len(nodes)-1
    if parent is not None:nodes[parent].setdefault('children',[]).append(idx)
    return idx
def uv_for(x,y):return [x/1024,y/1536]
# Body and head use the original portrait, keeping its hair, bun and costume.
nodes.append({'name':'Elara'});nodes.append({'name':'Head','translation':[0,3.48,0]});nodes[0]['children']=[1]
# Mesh coordinates remain in projected portrait space, compensated by the pivot.
nodes.append({'name':'HeadGeometry','translation':[0,-3.48,0]});nodes[1]['children']=[2]
# One continuous portrait surface: runtime blends the head transform through the neck.
verts=[];uv=[];ix=[];cols=40;rows=96
for row in range(rows+1):
 for col in range(cols+1):
  x=col/cols*1024;y=row/rows*1536
  verts.append((x,y,0));uv.append(uv_for(x,y))
for row in range(rows):
 for col in range(cols):
  a=row*(cols+1)+col;b=a+1;c=b+cols+1;d=a+cols+1;ix.extend([a,c,b,a,d,c])
targets=[[deformation(*v,k) if k>=8 else xyz(*v) for v in verts] for k in range(len(names))]
mesh('Body',verts,uv,ix,targets=targets,parent=0)
# Projected face patch. The holes are covered by independent eye/lip topology.
outline=[(511,241),(560,253),(603,292),(637,345),(648,411),(628,480),(597,531),(553,574),(520,590),(492,582),(451,557),(413,513),(388,466),(374,413),(385,361),(422,306),(468,266)]
def inside(x,y):
    odd=False;j=len(outline)-1
    for i,(xi,yi) in enumerate(outline):
        xj,yj=outline[j]
        if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi)+xi:odd=not odd
        j=i
    return odd
verts=[];uv=[];ix=[];lookup={};step=3
for y in range(240,595,step):
 for x in range(371,653,step):
    lookup[(x,y)]=len(verts);verts.append((x,y,depth(x,y)));uv.append(uv_for(x,y))
for y in range(240,592,step):
 for x in range(371,650,step):
    for coords in [[(x,y),(x+step,y+step),(x+step,y)],[(x,y),(x,y+step),(x+step,y+step)]]:
        cx=sum(p[0] for p in coords)/3;cy=sum(p[1] for p in coords)/3
        hole=any(((cx-ex)/rx)**2+((cy-ey)/ry)**2<1 for ex,ey,rx,ry in [(450,383,43,18),(590,389,40,18)])
        if inside(cx,cy) and not hole:ix.extend(lookup[c] for c in coords)
targets=[[deformation(*p,k) if k<8 and k!=2 else xyz(*p) for p in verts] for k in range(len(names))]
mesh('FaceSurface',verts,uv,ix,targets=targets,parent=2)
# Eyelids: four concentric loops. Inner rims meet on blink, outer skin stays fixed.
for eye,(cx,cy,rx,ry) in enumerate([(450,383,37,13),(590,389,34,13)]):
    verts=[];uv=[];ix=[];targets=[[] for _ in names];segments=64;rings=5
    for ring in range(rings):
      t=ring/(rings-1)
      for j in range(segments):
        angle=2*math.pi*j/segments;dx=(rx+13*t)*math.cos(angle);dy=(ry+14*t)*math.sin(angle)
        x=cx+dx;y=cy+dy;z=depth(x,y)+19*(1-t)+.4
        verts.append((x,y,z));uv.append(uv_for(x,y))
        for k in range(len(names)):
          py=cy+dy*(t if k==eye else 1)
          if k==6+eye:py=cy+dy*(1-.18*(1-t))
          targets[k].append(xyz(x,py,z+(1-t if k==eye else 0)))
    for r in range(rings-1):
      for j in range(segments):
        a=r*segments+j;b=r*segments+(j+1)%segments;c=b+segments;d=a+segments;ix.extend([a,c,b,a,d,c])
    mesh('EyelidLeft' if eye==0 else 'EyelidRight',verts,uv,ix,targets=targets,parent=2)
    # Independent curved sclera. Original sclera reference avoids plain white eyeballs.
    verts=[(cx,cy,depth(cx,cy)+16)];uv=[uv_for(cx,cy)];ix=[]
    for j in range(65):
      a=j*2*math.pi/64;x=cx+(rx+2)*math.cos(a);y=cy+(ry+2)*math.sin(a);verts.append((x,y,depth(x,y)+5));uv.append(uv_for(x,y))
      if j:ix.extend([0,j+1,j])
    mesh('ScleraLeft' if eye==0 else 'ScleraRight',verts,uv,ix,material=1,parent=2)
    # Iris is a separate mesh and can rotate/translate inside the fixed eyelids.
    verts=[(cx,cy,depth(cx,cy)+18)];uv=[uv_for(cx,cy)];ix=[]
    for j in range(65):
      a=j*2*math.pi/64;x=cx+13.7*math.cos(a);y=cy+13.7*math.sin(a);verts.append((x,y,depth(cx,cy)+16));uv.append(uv_for(x,y))
      if j:ix.extend([0,j+1,j])
    mesh('IrisLeft' if eye==0 else 'IrisRight',verts,uv,ix,parent=2)
# Curved lip overlay shares the exact reference coordinates. No synthetic cavity,
# dental rectangles or ellipse-shaped lip rim replaces the original closed mouth.
verts=[];uv=[];ix=[];cols=30;rows=18
for row in range(rows+1):
 for col in range(cols+1):
  x=440+col/cols*146;y=474+row/rows*86
  verts.append((x,y,depth(x,y)+1));uv.append(uv_for(x,y))
for row in range(rows):
 for col in range(cols):
  a=row*(cols+1)+col;b=a+1;c=b+cols+1;d=a+cols+1;ix.extend([a,c,b,a,d,c])
mesh('MouthOverlay',verts,uv,ix,parent=2)
# Standard glTF with embedded PNG textures; no remote asset dependence.
images=[]
for name in ['assistant-human.webp','elara-sclera.webp']:
 data=io.BytesIO();Image.open(root/'public/images'/name).save(data,format='PNG');raw=data.getvalue()
 while len(blob)%4:blob.append(0)
 views.append({'buffer':0,'byteOffset':len(blob),'byteLength':len(raw)});blob.extend(raw);images.append({'bufferView':len(views)-1,'mimeType':'image/png'})
materials=[{'name':'ReferenceSkinHair','pbrMetallicRoughness':{'baseColorTexture':{'index':0}},'alphaMode':'BLEND','doubleSided':True,'extensions':{'KHR_materials_unlit':{}}},{'name':'NaturalSclera','pbrMetallicRoughness':{'baseColorTexture':{'index':1}},'doubleSided':True,'extensions':{'KHR_materials_unlit':{}}},{'name':'OralInterior','pbrMetallicRoughness':{'baseColorFactor':[.055,.009,.018,1]},'doubleSided':True,'extensions':{'KHR_materials_unlit':{}}}]
materials.extend([{'name':'UpperTeeth','pbrMetallicRoughness':{'baseColorFactor':[.67,.61,.53,1]},'alphaMode':'BLEND','doubleSided':True,'extensions':{'KHR_materials_unlit':{}}},{'name':'Tongue','pbrMetallicRoughness':{'baseColorFactor':[.18,.055,.075,1]},'alphaMode':'BLEND','doubleSided':True,'extensions':{'KHR_materials_unlit':{}}}])
gltf={'asset':{'version':'2.0','generator':'HD Elara facial rig builder'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':nodes,'meshes':meshes,'materials':materials,'extensionsUsed':['KHR_materials_unlit'],'textures':[{'source':0},{'source':1}],'images':images,'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(blob)}],'extras':{'purpose':'Frontal 3D facial rig with projected reference. Body and hair remain portrait surfaces. Not a 360-degree full-body model.','morphTargets':names,'coordinates':'Projected original 1024x1536 reference, 100px per unit.'}}
js=json.dumps(gltf,separators=(',',':')).encode();js+=b' '*((-len(js))%4);blob.extend(b'\0'*((-len(blob))%4))
result=struct.pack('<4sII',b'glTF',2,12+8+len(js)+8+len(blob))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(blob),b'BIN\0')+blob
out=root/'public/models';out.mkdir(exist_ok=True);(out/'elara-face.glb').write_bytes(result)
print(f'Elara rig: {len(meshes)} meshes, {len(accessors)} accessors, {len(result)} bytes; eleven face/body morph controls.')
