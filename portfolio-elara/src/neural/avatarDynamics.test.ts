import { expect,it } from 'vitest';
import {audioMouthLevel,mouthPose} from './avatarDynamics';
it('keeps silence closed and makes ordinary speech energy visible without amplifying noise',()=>{
 expect(audioMouthLevel(.002)).toBe(0);expect(audioMouthLevel(.025)).toBeGreaterThan(.35);expect(audioMouthLevel(1)).toBe(1);
 expect(mouthPose('closed',.8).jaw).toBe(0);expect(mouthPose('open',.6).jaw).toBeCloseTo(.432);
 expect(mouthPose('round',.6).funnel).toBeGreaterThan(0);
});
