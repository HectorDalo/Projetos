import { afterEach, expect, it, vi } from 'vitest';
import { loadPublicProfile, parsePublicProfile, PROFILE_URL } from './publicProfile';
const valid={schemaVersion:1,owner:'Hector Dalonso',updatedAt:'2026-10-27',summary:{pt:'Resumo público',en:'Public summary'},facts:{pt:['Estágio no ENIAC'],en:['ENIAC internship']}};
afterEach(()=>vi.unstubAllGlobals());
it('only fetches the fixed public file when explicitly enabled',async()=>{
 const fetch=vi.fn().mockResolvedValue(Response.json(valid));vi.stubGlobal('fetch',fetch);
 expect(await loadPublicProfile(false)).toBeNull();expect(fetch).not.toHaveBeenCalled();
 expect(await loadPublicProfile(true)).toEqual(valid);expect(fetch.mock.calls[0][0]).toBe(PROFILE_URL);
});
it('rejects malformed updates and strips unrecognized fields',()=>{
 expect(parsePublicProfile({...valid,owner:'Someone else'})).toBeNull();
 expect(parsePublicProfile({...valid,facts:{pt:['x'.repeat(1001)],en:[]}})).toBeNull();
 expect(parsePublicProfile({...valid,privateNotes:'must not be forwarded'})).toEqual(valid);
});
it('keeps the local profile available when the public file is missing or oversized',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('not found',{status:404})));
 expect(await loadPublicProfile(true)).toBeNull();
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('x'.repeat(32001))));
 expect(await loadPublicProfile(true)).toBeNull();
});
