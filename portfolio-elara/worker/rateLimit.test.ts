import { afterEach, expect, it } from 'vitest';
import { LIMITS, rateLimited, resetRateLimits } from './rateLimit';
afterEach(()=>resetRateLimits());
const req=(ip?:string)=>new Request('https://x.test/api/chat',{method:'POST',headers:ip?{'CF-Connecting-IP':ip}:{}});
it('limits one visitor per window without affecting others or unidentified requests',()=>{
 for(let i=0;i<LIMITS.chat.max;i++)expect(rateLimited(req('1.1.1.1'),'chat',1000)).toBe(0);
 expect(rateLimited(req('1.1.1.1'),'chat',1000)).toBeGreaterThan(0);
 expect(rateLimited(req('2.2.2.2'),'chat',1000)).toBe(0);
 expect(rateLimited(req(),'chat',1000)).toBe(0);
 expect(rateLimited(req('1.1.1.1'),'chat',1000+LIMITS.chat.windowMs)).toBe(0);
});
