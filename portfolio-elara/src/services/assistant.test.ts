import { afterEach, describe, expect, it, vi } from 'vitest';
import { capabilities } from './assistant';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('honest disconnected state', () => {
  it('uses the same-origin Pages API by default', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ chat_available: false, voice_available: false }) });
    vi.stubGlobal('fetch', fetchSpy);
    expect(await capabilities()).toEqual({ chat_available: false, voice_available: false });
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/capabilities');
  });
  it('rejects fabricated or malformed capability responses', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ chat_available: 'true', voice_available: false }) }));
    const api = await import('./assistant');
    await expect(api.capabilities()).rejects.toThrow('Invalid capabilities');
  });
  it('uses the real endpoint and preserves reply captions', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test/');
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reply: 'Real provider reply', caption: 'Caption' }) });
    vi.stubGlobal('fetch', fetchSpy);
    const api = await import('./assistant');
    expect(await api.sendMessage([{ role: 'user', content: 'Hello' }], 'en')).toEqual({ reply: 'Real provider reply', caption: 'Caption' });
    expect(fetchSpy.mock.calls[0][0]).toBe('https://api.example.test/api/chat');
  });
  it('rejects HTTP errors instead of synthesizing a successful answer', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 501 }));
    const api = await import('./assistant');
    await expect(api.sendMessage([{ role: 'user', content: 'Hello' }], 'en')).rejects.toThrow('501');
  });
});
