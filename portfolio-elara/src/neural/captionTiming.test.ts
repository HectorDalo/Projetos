import { expect,it } from 'vitest';
import { audibleElapsed,captionWordAt } from './captionTiming';
it('highlights the complete written word for phoneme or syllable offsets, preserving punctuation and accents',()=>{
 expect(captionWordAt('O Héctor é dedicado.',4)).toEqual({start:2,length:6});
 expect(captionWordAt('O Héctor é dedicado.',9)).toEqual({start:9,length:1});
 expect(captionWordAt('O Héctor é dedicado.',13)).toEqual({start:11,length:9});
 expect(captionWordAt('Oi Hector',2)).toBeUndefined();expect(captionWordAt('Oi',8)).toBeUndefined();
});
it('uses the output clock for captions and falls back to speaker latency rather than an invented word timer',()=>{
 expect(audibleElapsed({currentTime:2,getOutputTimestamp:()=>({contextTime:1.86})},1)).toBeCloseTo(.86);
 expect(audibleElapsed({currentTime:2,outputLatency:.12},1)).toBeCloseTo(.88);
 expect(audibleElapsed({currentTime:2,baseLatency:.04},1)).toBeCloseTo(.96);
 expect(audibleElapsed({currentTime:0,outputLatency:.1},0)).toBe(0);
});
