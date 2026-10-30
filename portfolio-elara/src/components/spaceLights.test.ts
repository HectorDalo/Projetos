import {expect,it} from 'vitest';
import {softLightSprite} from './spaceLights';
it('renders transparent corners and a smooth circular light instead of an opaque square point',()=>{
 const size=64,data=softLightSprite(size),alpha=(x:number,y:number)=>data[(y*size+x)*4+3];
 for(const [x,y] of [[0,0],[63,0],[0,63],[63,63]])expect(alpha(x,y)).toBe(0);
 expect(alpha(31,31)).toBeGreaterThan(250);expect(alpha(31,16)).toBeGreaterThan(alpha(31,4));
 expect(alpha(31,16)).toBe(alpha(16,31));
});
