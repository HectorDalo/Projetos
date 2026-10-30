import { occludeEye } from '../neural/eyeOcclusion';
import { mouthPose } from '../neural/avatarDynamics';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AssistantPerformance } from '../hooks/useAssistantVoice';

// Frontal geometric facial rig: body/hair preserve the portrait reference.
// Actual morph targets deform eyelids, jaw and lips; this is not a full-body 360° asset.
export default function ElaraFaceRig({ performance }: { performance: AssistantPerformance }) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef(performance); state.current = performance;
  useEffect(() => {
    const container = host.current; if (!container || typeof WebGL2RenderingContext === 'undefined') return;
    const mobile=matchMedia('(max-width: 760px) and (pointer: coarse)').matches;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !mobile, powerPreference: 'low-power' }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile?1:1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-5.12, 5.12, 7.68, -7.68, .1, 100); camera.position.z = 20;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false, visible = true, model: THREE.Object3D | null = null, head: THREE.Object3D | undefined;
    let mouthMaterial: THREE.ShaderMaterial | undefined;
    const mouthTextures: THREE.Texture[] = [];
    const loadedMouthShapes = new Set<string>();
    let lipOpen=0;
    let portrait: THREE.Mesh | undefined, portraitBase: Float32Array | undefined;
    const point = new THREE.Vector3(), headTransform = new THREE.Matrix4(), pivotOffset = new THREE.Matrix4().makeTranslation(0,-3.48,0);
    const previousHead=new THREE.Matrix4();let portraitMoved=false;
    const touch=matchMedia('(pointer: coarse)').matches;
    let last = 0, jaw = 0, funnel = 0, smile = 0, brow = 0, nextBlink = 3.8, blinkStart = -10, blinkCount = 0;
    const meshes: THREE.Mesh[] = [];
    const irises: THREE.Object3D[] = [];
    const eyeMasks: ReturnType<typeof occludeEye>[] = [];
    const stage = container.closest<HTMLElement>('.avatar-stage');
    const disposeModel = (object: THREE.Object3D) => object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
        material.dispose();
      }
    });
    new GLTFLoader().load('/models/elara-face.glb?v=reference-lips-5', gltf => {
      if (disposed) { disposeModel(gltf.scene); return; }
      model = gltf.scene; scene.add(model); head = model.getObjectByName('Head');
      model.traverse(child => { if(child instanceof THREE.Mesh){for(const material of Array.isArray(child.material)?child.material:[child.material]){if(material instanceof THREE.MeshBasicMaterial&&material.map){material.alphaTest=.02;material.depthWrite=true;}}} if (child instanceof THREE.Mesh && child.morphTargetInfluences) meshes.push(child); if (/^Iris/.test(child.name)) irises.push(child); if (child instanceof THREE.Mesh && /^(Iris|Sclera)(Left|Right)$/.test(child.name)) eyeMasks.push(occludeEye(child, child.name.endsWith('Left') ? 'Left' : 'Right')); });
      const body=model.getObjectByName('Body');
      if(body instanceof THREE.Mesh){portrait=body;const position=body.geometry.getAttribute('position') as THREE.BufferAttribute;portraitBase=new Float32Array(position.array);position.setUsage(THREE.DynamicDrawUsage);}container.dataset.bodyRig=String(body instanceof THREE.Mesh && body.morphTargetDictionary?.bodyBreath!==undefined);
      const lips=model.getObjectByName('MouthOverlay');
      if(lips instanceof THREE.Mesh){
        const original=(lips.material as THREE.MeshBasicMaterial).map;
        mouthMaterial=new THREE.ShaderMaterial({
          transparent:true,depthWrite:false,side:THREE.DoubleSide,
          uniforms:{mouthMap:{value:original},opening:{value:0}},
          vertexShader:'varying vec2 lipUv; void main(){lipUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
          fragmentShader:`uniform sampler2D mouthMap;uniform float opening;varying vec2 lipUv;
            void main(){
              vec2 p=(lipUv*vec2(1024.0,1536.0)-vec2(513.0,517.0))/vec2(70.0,40.0);
              float mask=1.0-smoothstep(0.64,1.0,length(p));
              vec4 color=texture2D(mouthMap,lipUv);gl_FragColor=vec4(color.rgb,mask*opening);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }`,
        });
        lips.material=mouthMaterial;lips.renderOrder=2;
        const loader=new THREE.TextureLoader();
        for(const shape of ['open','round','speaking']){
          const texture=loader.load(`/images/elara-${shape}.webp`,()=>{
            if(disposed){texture.dispose();return;}loadedMouthShapes.add(shape);
          });
          texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.userData.shape=shape;
          mouthTextures.push(texture);
        }
      }
      container.dataset.ready = 'true'; container.dataset.rig = 'reference-lips';
    }, undefined, () => { container.dataset.ready = 'false'; });
    const resize = new ResizeObserver(() => { renderer.setSize(container.clientWidth, container.clientHeight, false); });
    resize.observe(container);
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; }); observer.observe(container);
    const lost = (event: Event) => { event.preventDefault(); container.dataset.ready = 'false'; };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    renderer.setAnimationLoop(time => {
      if (disposed || document.hidden || !visible || time-last < 1000/(mobile?(state.current.phase==='speaking'?30:12):touch && state.current.phase!=='speaking'?20:30)) return;
      const dt = Math.min((time-last)/1000, .1); last = time;
      const current = state.current;
      const talking = current.phase === 'speaking';
      const mobileSpeech=mobile&&talking;
      const liveMouth=mobileSpeech?current.readMouthFrame?.():undefined;
      const x = talking || motion.matches ? 0 : Number(stage?.dataset.gazeX ?? 0);
      const y = talking || motion.matches ? 0 : Number(stage?.dataset.gazeY ?? 0);
      const seconds=time/1000;
      const breath=motion.matches||mobileSpeech?0:(.5+.5*Math.sin(seconds*1.25));
      const shift=motion.matches||mobileSpeech?0:Math.sin(seconds*.48)*.75;
      const listening=current.phase==='listening';
      if (head) {
        head.rotation.y = x*.065;
        head.position.y=3.48+breath*.035;
        head.rotation.x = -y*.035 + (motion.matches||mobileSpeech?0:Math.sin(seconds*1.1)*(talking?.012:listening?.018:.012));
        head.rotation.z = -x*.012 + (motion.matches||mobileSpeech?0:Math.sin(seconds*.65)*.009);
      }
      if (head && portrait && portraitBase) {
        head.updateMatrix(); headTransform.multiplyMatrices(head.matrix, pivotOffset);
        const updatePortrait=!mobile||!portraitMoved||!previousHead.equals(headTransform);
        if(updatePortrait){
        previousHead.copy(headTransform);portraitMoved=true;
        const position = portrait.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i=0; i<position.count; i++) {
          const offset=i*3, px=portraitBase[offset], py=portraitBase[offset+1], pz=portraitBase[offset+2];
          const imageY=768-py*100;
          const t=Math.max(0,Math.min(1,(imageY-570)/210));
          const influence=1-t*t*(3-2*t);
          point.set(px,py,pz).applyMatrix4(headTransform);
          position.setXYZ(i,px+(point.x-px)*influence,py+(point.y-py)*influence,pz+(point.z-pz)*influence);
        }
        position.needsUpdate=true;}
      }
      for (const iris of irises) { iris.position.x = x*.025; iris.position.y = -y*.02; }
      if(seconds>=nextBlink){blinkStart=seconds;blinkCount++;nextBlink=seconds+4.1+(Math.sin(blinkCount*2.399)+1)*1.1;}
      const blinkTime=seconds-blinkStart;
      const blink=motion.matches?0:blinkTime<.09?Math.sin(Math.max(0,blinkTime)/.09*Math.PI/2):blinkTime<.24?Math.cos((blinkTime-.09)/.15*Math.PI/2):0;
      const squint=motion.matches?0:talking?.07:.02;
      for(const mask of eyeMasks)mask.update(blink,squint);
      const shape = talking ? liveMouth?.viseme??current.viseme : 'closed';
      const amplitude = talking ? Math.min(1, liveMouth?.mouthOpen??current.mouthOpen??0) : 0;
      const pose=mouthPose(shape ?? 'closed',amplitude);
      const targetJaw=pose.jaw;
      // Texture blending keeps the original lip shape when idle and during pauses.
      const shapeName=shape==='round'?'round':shape==='open'?'open':'speaking';
      const lipTexture=mouthTextures.find(texture=>texture.userData.shape===shapeName);
      const desiredLip=talking&&shape!=='closed'&&amplitude>.025?Math.min(.92,amplitude*1.8):0;
      lipOpen+=(desiredLip-lipOpen)*(1-Math.exp(-dt*(mobileSpeech?48:desiredLip>lipOpen?18:26)));
      if(!talking||(mobileSpeech&&shape==='closed'))lipOpen=0;
      if(mouthMaterial){
        if(lipTexture&&loadedMouthShapes.has(shapeName))mouthMaterial.uniforms.mouthMap.value=lipTexture;
        mouthMaterial.uniforms.opening.value=lipTexture&&loadedMouthShapes.has(shapeName)?lipOpen:0;
      }
      const smoothing = 1-Math.exp(-dt*(mobileSpeech?48:14));
      jaw += (targetJaw-jaw)*smoothing;
      if(mobileSpeech&&shape==='closed')jaw=0;
      funnel += (pose.funnel-funnel)*smoothing;
      smile += ((.04+pose.smile)-smile)*smoothing;
      brow += ((listening?.18:current.phase==='thinking'?.09:.025)-brow)*smoothing;
      for (const mesh of meshes) {
        const weights = mesh.morphTargetInfluences!, dictionary = mesh.morphTargetDictionary!;
        for (const [name, value] of Object.entries({ eyeBlinkLeft: blink, eyeBlinkRight: blink, jawOpen: jaw, mouthFunnel: funnel, mouthSmile: smile, browInnerUp: motion.matches?0:brow, eyeSquintLeft: squint, eyeSquintRight: squint, bodyBreath: breath, weightShift: shift, shoulderLift: motion.matches?0:listening?.45:talking?.12:.08 })) {
          const i = dictionary[name]; if (i!==undefined) weights[i] = value;
        }
      }
      container.dataset.mouth = jaw.toFixed(2); container.dataset.headYaw=(head?.rotation.y??0).toFixed(3);container.dataset.breath=breath.toFixed(2); container.dataset.blink = blink.toFixed(2);
      renderer.render(scene, camera);
    });
    return () => {
      disposed = true; resize.disconnect(); observer.disconnect(); renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      if (model) disposeModel(model); mouthTextures.forEach(texture=>texture.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div ref={host} className="elara-face-canvas" aria-hidden="true" />;
}
