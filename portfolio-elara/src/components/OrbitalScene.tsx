import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { softLightSprite } from './spaceLights';

// Decorative layers over the observatory, with smaller budgets on mobile.
export default function OrbitalScene() {
  const container=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const host=container.current;
    if(!host || typeof WebGLRenderingContext==='undefined')return;
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile=window.matchMedia('(max-width: 760px)').matches;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,mobile?1.25:2));host.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(50,1,.1,50);camera.position.z=6;
    const texture=new THREE.DataTexture(softLightSprite(),64,64,THREE.RGBAFormat);texture.needsUpdate=true;
    texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
    const layers=[0,1].map(layer=>{
      const count=mobile?(layer?32:88):(layer?70:230),positions=new Float32Array(count*3);
      for(let i=0;i<count;i++){
        positions[i*3]=(Math.random()-.5)*17;positions[i*3+1]=(Math.random()-.5)*10;
        positions[i*3+2]=-Math.random()*6-layer*2;
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
      const material=new THREE.PointsMaterial({map:texture,color:layer?'#75d7fa':'#d3f2ff',size:layer?.095:.055,transparent:true,opacity:layer?.28:.42,depthWrite:false,blending:THREE.AdditiveBlending,alphaTest:.002});
      const points=new THREE.Points(geometry,material);scene.add(points);return {points,geometry,material};
    });
    let visible=true,last=0,elapsed=0;
    const render=(time:number)=>{
      if(document.hidden||!visible)return;
      if(time-last<1000/(mobile?24:30))return;
      const delta=last?Math.min((time-last)/1000,.1):0;last=time;
      if(!motion.matches)elapsed+=delta;
      layers.forEach(({points,material},i)=>{
        points.rotation.z=elapsed*(i?-.003:.002);
        points.rotation.y=Math.sin(elapsed*.04+i)*.07;
        points.position.x=Math.sin(elapsed*.045+i)*.18;
        points.position.y=Math.sin(elapsed*.035+i)*.10;
        material.opacity=(i?.25:.38)+(motion.matches?0:Math.sin(elapsed*.7+i)*.045);
      });
      renderer.render(scene,camera);
    };
    const resize=new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();if(motion.matches)renderer.render(scene,camera);});resize.observe(host);
    const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;last=0;});observer.observe(host);
    const updateMotion=()=>{last=0;renderer.setAnimationLoop(motion.matches?null:render);if(motion.matches){renderer.render(scene,camera);}};
    updateMotion();motion.addEventListener('change',updateMotion);
    return()=>{resize.disconnect();observer.disconnect();motion.removeEventListener('change',updateMotion);renderer.setAnimationLoop(null);layers.forEach(({geometry,material})=>{geometry.dispose();material.dispose();});texture.dispose();renderer.dispose();renderer.domElement.remove();};
  },[]);
  return <div className="orbital-scene" ref={container} aria-hidden="true"/>;
}
