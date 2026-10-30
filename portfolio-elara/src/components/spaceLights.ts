// Procedural circular light sprite: transparent corners prevent square particles.
export function softLightSprite(size=64):Uint8Array {
  const pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const radius=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
    const alpha=radius>=1?0:Math.max(0,(Math.exp(-radius*radius*7)-Math.exp(-7))/(1-Math.exp(-7)));
    const i=(y*size+x)*4;pixels[i]=190;pixels[i+1]=235;pixels[i+2]=255;pixels[i+3]=Math.round(alpha*255);
  }
  return pixels;
}
