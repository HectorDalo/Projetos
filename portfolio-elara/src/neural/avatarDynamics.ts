import type { Viseme } from './timing';
export function audioMouthLevel(rms:number):number {
  if(!Number.isFinite(rms)||rms<=.003)return 0;
  return Math.min(1,Math.pow((rms-.003)/.09,.65));
}
export function mouthPose(shape:Viseme,level:number){
  const energy=Math.max(0,Math.min(1,level));
  return {jaw:shape==='closed'?0:energy*({open:.72,round:.52,wide:.38,small:.27}[shape]),funnel:shape==='round'?energy*.38:0,smile:shape==='wide'?energy*.18:0};
}
