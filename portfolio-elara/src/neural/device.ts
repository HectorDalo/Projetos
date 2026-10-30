// Decides where the neural voice runs. Phones and tablets default to the CPU (WASM q8,
// ~90 MB) instead of WebGPU fp32 (~330 MB): the fp32 download and GPU memory were the
// main cost on mobile, and mobile GPUs are not reliably faster for this model.
// `?voz=gpu` or `?voz=cpu` overrides the choice for measurement on a real device.
export type VoiceDevicePreference = { preferCpu: boolean; reason: 'override' | 'mobile' | 'desktop' };
type Probe = { search?: string; coarsePointer?: boolean; maxTouchPoints?: number; userAgent?: string; uaMobile?: boolean; deviceMemory?: number };
export function voiceDevicePreference(probe: Probe = browserProbe()): VoiceDevicePreference {
  const override = new URLSearchParams(probe.search ?? '').get('voz');
  if (override === 'gpu') return { preferCpu: false, reason: 'override' };
  if (override === 'cpu') return { preferCpu: true, reason: 'override' };
  const ua = probe.userAgent ?? '';
  const mobileUa = probe.uaMobile === true || /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  // iPadOS reports a desktop Safari UA; touch points + coarse pointer identify it.
  const touchDevice = probe.coarsePointer === true && (probe.maxTouchPoints ?? 0) > 1;
  const lowMemory = typeof probe.deviceMemory === 'number' && probe.deviceMemory <= 4;
  return mobileUa || touchDevice || lowMemory ? { preferCpu: true, reason: 'mobile' } : { preferCpu: false, reason: 'desktop' };
}
function browserProbe(): Probe {
  if (typeof window === 'undefined') return {};
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean }; deviceMemory?: number };
  return {
    search: window.location?.search,
    coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    maxTouchPoints: nav.maxTouchPoints,
    userAgent: nav.userAgent,
    uaMobile: nav.userAgentData?.mobile,
    deviceMemory: nav.deviceMemory,
  };
}
// Approximate silence to hold back before the first chunk so later chunks arrive in time.
// rtf = synthesis seconds per audio second measured on the first chunk.
export function startLead({ rtf, firstAudio, firstChars, totalChars, lastChars, maxLead = 3.5 }: { rtf: number; firstAudio: number; firstChars: number; totalChars: number; lastChars?: number; maxLead?: number }): number {
  if (!(rtf > 0) || !(firstAudio > 0) || firstChars <= 0 || totalChars <= firstChars) return 0;
  const perChar = firstAudio / firstChars;
  const remainingAudio = perChar * (totalChars - firstChars);
  const lastChunkAudio = perChar * Math.min(lastChars ?? 170, totalChars - firstChars);
  const needed = rtf * remainingAudio - (firstAudio + remainingAudio - lastChunkAudio);
  return Math.max(0, Math.min(maxLead, needed));
}
