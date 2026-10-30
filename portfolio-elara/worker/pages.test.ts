import { expect, it, vi } from 'vitest';
import pages from './pages';
it('serves static portfolio assets without calling AI', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('<html>HD</html>',{headers:{'content-type':'text/html'}}));
  const run=vi.fn();
  const response=await pages.fetch(new Request('https://hd.example/'),{ASSETS:{fetch},AI:{run}});
  expect(await response.text()).toContain('HD'); expect(run).not.toHaveBeenCalled();
});
it('routes API requests through the AI handler instead of asset fallback', async () => {
  const fetch=vi.fn();
  const response=await pages.fetch(new Request('https://hd.example/api/capabilities'),{ASSETS:{fetch}});
  expect(await response.json()).toHaveProperty('chat_available',false); expect(fetch).not.toHaveBeenCalled();
});
