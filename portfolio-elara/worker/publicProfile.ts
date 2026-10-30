// Only a fixed, public, owner-maintained file may supply professional updates.
export const PROFILE_URL = 'https://raw.githubusercontent.com/HectorDalo/Projetos/main/portfolio-elara/elara-profile.json';
export type PublicProfile = { schemaVersion: 1; owner: 'Hector Dalonso'; updatedAt: string; summary: { pt: string; en: string }; facts: { pt: string[]; en: string[] } };
export function parsePublicProfile(value: unknown): PublicProfile | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== 1 || data.owner !== 'Hector Dalonso' || typeof data.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt)) return null;
  const summary = data.summary as Record<string, unknown> | undefined;
  const facts = data.facts as Record<string, unknown> | undefined;
  if (!summary || !facts) return null;
  for (const lang of ['pt', 'en']) {
    if (typeof summary[lang] !== 'string' || !(summary[lang] as string).trim() || (summary[lang] as string).length > 4000) return null;
    const rows = facts[lang];
    if (!Array.isArray(rows) || rows.length > 30 || !rows.every(row => typeof row === 'string' && row.trim() && row.length <= 1000)) return null;
  }
  // Discard every unrecognized key instead of forwarding arbitrary repository content.
  return {schemaVersion:1,owner:'Hector Dalonso',updatedAt:data.updatedAt,summary:{pt:summary.pt as string,en:summary.en as string},facts:{pt:facts.pt as string[],en:facts.en as string[]}};
}
export async function loadPublicProfile(enabled: boolean): Promise<PublicProfile | null> {
  if (!enabled) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(PROFILE_URL, {signal:controller.signal,redirect:'error',headers:{Accept:'application/json'},cf:{cacheTtl:300,cacheEverything:true}} as RequestInit);
    if (!response.ok) return null;
    const reader = response.body?.getReader(); if (!reader) return null;
    let size = 0; const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const {done,value}=await reader.read();if(done)break;
        size+=value.byteLength;if(size>32000){await reader.cancel();return null;}chunks.push(value);
      }
    } finally {reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    return parsePublicProfile(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {return null;} finally {clearTimeout(timer);}
}
