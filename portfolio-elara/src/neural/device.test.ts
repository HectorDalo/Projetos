import { expect, it } from 'vitest';
import { startLead, voiceDevicePreference } from './device';
it('runs the voice on the CPU for phones and tablets and allows a URL override',()=>{
 expect(voiceDevicePreference({userAgent:'Mozilla/5.0 (Linux; Android 14) Mobile'}).preferCpu).toBe(true);
 expect(voiceDevicePreference({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)'}).preferCpu).toBe(true);
 expect(voiceDevicePreference({userAgent:'Mozilla/5.0 (Macintosh)',coarsePointer:true,maxTouchPoints:5}).preferCpu).toBe(true);
 expect(voiceDevicePreference({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',coarsePointer:false,maxTouchPoints:0,deviceMemory:8}).preferCpu).toBe(false);
 expect(voiceDevicePreference({userAgent:'Android Mobile',search:'?voz=gpu'}).preferCpu).toBe(false);
 expect(voiceDevicePreference({userAgent:'Windows',search:'?voz=cpu'}).preferCpu).toBe(true);
});
it('adds no initial wait when synthesis keeps up and caps the wait when it does not',()=>{
 expect(startLead({rtf:.4,firstAudio:2,firstChars:40,totalChars:200,lastChars:60})).toBe(0);
 // A long final chunk after a short first one needs a short wait even on a fast device.
 expect(startLead({rtf:.4,firstAudio:2,firstChars:40,totalChars:200})).toBeCloseTo(1.2);
 expect(startLead({rtf:1,firstAudio:2,firstChars:200,totalChars:200})).toBe(0);
 const slow=startLead({rtf:1.6,firstAudio:2,firstChars:40,totalChars:200});
 expect(slow).toBeGreaterThan(0);expect(slow).toBeLessThanOrEqual(3.5);
 expect(startLead({rtf:5,firstAudio:2,firstChars:40,totalChars:2000})).toBe(3.5);
});
