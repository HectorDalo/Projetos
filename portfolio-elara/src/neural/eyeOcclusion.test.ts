import {expect,it} from 'vitest';
import * as THREE from 'three';
import {eyeOpening,occludeEye,eyeWindows} from './eyeOcclusion';
it('closes the eye aperture during a blink including the additive speech squint',()=>{
 expect(eyeOpening(0,0)).toBe(1);
 expect(eyeOpening(.5,.07)).toBeCloseTo(.4874);
 expect(eyeOpening(1,.07)).toBe(0);
 expect(eyeOpening(.999,.07)).toBe(0);
 expect(eyeOpening(0,.02)).toBeCloseTo(.9964);
});
it('isolates eye material from the face and keeps the clipping window fixed during gaze',()=>{
 const faceMaterial=new THREE.MeshBasicMaterial();const iris=new THREE.Mesh(new THREE.PlaneGeometry(),faceMaterial);
 const mask=occludeEye(iris,'Left');
 expect(iris.material).not.toBe(faceMaterial);
 const shader={uniforms:{} as Record<string,{value:any}>,vertexShader:'#include <begin_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};
 (iris.material as THREE.Material).onBeforeCompile(shader as any,{} as THREE.WebGLRenderer);
 iris.position.set(.025,-.02,0);mask.update(.8,.07);
 expect(shader.uniforms.eyeOffset.value.toArray()).toEqual([.025,-.02]);
 expect(shader.uniforms.eyeWindow.value.toArray()).toEqual([eyeWindows.Left.x,eyeWindows.Left.y,.37,.13]);
 expect(shader.uniforms.eyeOpening.value).toBeCloseTo(.1874);
 mask.update(1,.07);expect(shader.uniforms.eyeOpening.value).toBe(0);
 expect(shader.fragmentShader).toContain('discard');
 expect(faceMaterial.onBeforeCompile.toString()).not.toContain('eyeOpening');
 iris.geometry.dispose();iris.material.dispose();faceMaterial.dispose();
});
