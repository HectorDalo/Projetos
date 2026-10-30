import * as THREE from 'three';

// Inner eyelid rims in the frontal GLB's local coordinates (100 image pixels/unit).
export const eyeWindows = {
 Left: { x: -.62, y: 3.85, radiusX: .37, radiusY: .13 },
 Right: { x: .78, y: 3.79, radiusX: .34, radiusY: .13 },
};
export function eyeOpening(blink:number, squint:number):number {
 // The GLB's blink and squint morphs add their displacements at the inner rim.
 return Math.max(0, Math.min(1, 1 - blink - .18 * squint));
}
export function occludeEye(mesh:THREE.Mesh, side:keyof typeof eyeWindows) {
 const window=eyeWindows[side];
 const uniforms={
  eyeWindow:{value:new THREE.Vector4(window.x,window.y,window.radiusX,window.radiusY)},
  eyeOpening:{value:1},eyeOffset:{value:new THREE.Vector2()},
 };
 const source=mesh.material;
 // Skin, lids and irises share a material in the GLB; isolate only the eye meshes.
 const originals=Array.isArray(source)?source:[source];
 const materials=originals.map(original=>{
  const material=original.clone();
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='varying vec2 eyePoint; uniform vec2 eyeOffset;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\neyePoint=position.xy+eyeOffset;');
   shader.fragmentShader='varying vec2 eyePoint; uniform vec4 eyeWindow; uniform float eyeOpening;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
    if(eyeOpening<=0.001) discard;
    vec2 eyePosition=(eyePoint-eyeWindow.xy)/vec2(eyeWindow.z,eyeWindow.w*max(eyeOpening,0.001));
    if(dot(eyePosition,eyePosition)>1.0) discard;
   `);
  };
  material.customProgramCacheKey=()=> 'elara-eyelid-occlusion-v1';
  return material;
 });
 mesh.material=Array.isArray(source)?materials:materials[0];
 return {update(blink:number,squint:number){
  uniforms.eyeOpening.value=eyeOpening(blink,squint);
  uniforms.eyeOffset.value.set(mesh.position.x,mesh.position.y);
 }};
}
