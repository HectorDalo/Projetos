// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssistantPanel } from './AssistantPanel';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('renders a provider reply and sends the selected language', async () => {
  const fetchSpy = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ chat_available: true, voice_available: false }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Provider response for test', caption: 'Provider response for test' }) });
  vi.stubGlobal('fetch', fetchSpy);
  render(<AssistantPanel language="en" />);
  await waitFor(() => expect((screen.getByLabelText('Your message') as HTMLInputElement).disabled).toBe(false));
  await userEvent.type(screen.getByLabelText('Your message'), 'What is this project?');
  await userEvent.click(screen.getByRole('button', { name: 'Send message' }));
  expect(await screen.findByText('Provider response for test')).toBeTruthy();
  expect(JSON.parse(fetchSpy.mock.calls[1][1].body).language).toBe('en');
  expect(fetchSpy.mock.calls[1][0]).toBe('/api/chat');
});
it('explains exhausted daily quota and retries without duplicating the question', async () => {
  const fetchSpy = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ chat_available: true, voice_available: false }) })
    .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: 'quota_exhausted' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Recovered test reply' }) });
  vi.stubGlobal('fetch', fetchSpy);
  render(<AssistantPanel language="pt" />);
  await waitFor(() => expect((screen.getByLabelText('Sua mensagem') as HTMLInputElement).disabled).toBe(false));
  await userEvent.type(screen.getByLabelText('Sua mensagem'), 'Olá');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
  expect(await screen.findByText(/A cota gratuita de IA de hoje terminou/)).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText('Recovered test reply')).toBeTruthy();
  expect(JSON.parse(fetchSpy.mock.calls[2][1].body).messages).toHaveLength(1);
});
it('shows only the latest accessible reply, keeps no visual history or storage, and clears session context',async()=>{
  localStorage.clear();
  const fetchSpy=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({chat_available:true,voice_available:false})})
    .mockResolvedValueOnce({ok:true,json:async()=>({reply:'First ephemeral reply'})})
    .mockResolvedValueOnce({ok:true,json:async()=>({reply:'Second ephemeral reply'})})
    .mockResolvedValueOnce({ok:true,json:async()=>({reply:'Fresh conversation reply'})});
  vi.stubGlobal('fetch',fetchSpy);render(<AssistantPanel language="en"/>);
  await waitFor(()=>expect((screen.getByLabelText('Your message') as HTMLInputElement).disabled).toBe(false));
  await userEvent.type(screen.getByLabelText('Your message'),'First');await userEvent.click(screen.getByRole('button',{name:'Send message'}));
  expect(await screen.findByText('First ephemeral reply')).toBeTruthy();
  await userEvent.type(screen.getByLabelText('Your message'),'Second');await userEvent.click(screen.getByRole('button',{name:'Send message'}));
  expect(await screen.findByText('Second ephemeral reply')).toBeTruthy();
  expect(screen.queryByText('First ephemeral reply')).toBeNull();expect(screen.queryByRole('log')).toBeNull();
  expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);
  await userEvent.click(screen.getByText('Options',{exact:true}));
  await userEvent.click(screen.getByRole('button',{name:'Clear current conversation'}));
  expect(screen.queryByText('Second ephemeral reply')).toBeNull();
  await userEvent.type(screen.getByLabelText('Your message'),'New question');await userEvent.click(screen.getByRole('button',{name:'Send message'}));
  expect(await screen.findByText('Fresh conversation reply')).toBeTruthy();
  expect(JSON.parse(fetchSpy.mock.calls[3][1].body).messages).toEqual([{role:'user',content:'New question'}]);
});

it('uses the same natural voice on touch screens and expands a readable conversation',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({chat_available:true,voice_available:false})})
 .mockResolvedValueOnce({ok:true,json:async()=>({reply:'A complete, readable reply.'})}));
 render(<AssistantPanel language="en"/>);
 await waitFor(()=>expect((screen.getByLabelText('Your message') as HTMLInputElement).disabled).toBe(false));
 expect(screen.queryByLabelText('Voice')).toBeNull();
 expect((screen.getByLabelText('Elara audio') as HTMLSelectElement).value).toBe('neural');
 expect(screen.getByRole('option',{name:'Device voice unavailable'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Expand conversation'}));
 expect(screen.getByRole('button',{name:'Minimize conversation'}).getAttribute('aria-expanded')).toBe('true');
 fireEvent.change(screen.getByLabelText('Your message'),{target:{value:'Tell me about Hector'}});
 fireEvent.click(screen.getByRole('button',{name:'Send message'}));
 expect(await screen.findByText('A complete, readable reply.')).toBeTruthy();
 fireEvent.keyDown(window,{key:'Escape'});expect(screen.getByRole('button',{name:'Expand conversation'})).toBeTruthy();
});
it('keeps Hector’s self-introduction after earlier messages leave the context and clears it with the conversation',async()=>{
 const fetchSpy=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({chat_available:true,voice_available:false})})
 .mockImplementation(async()=>({ok:true,json:async()=>({reply:'A test reply'})}));
 vi.stubGlobal('fetch',fetchSpy);render(<AssistantPanel language="pt"/>);
 await waitFor(()=>expect((screen.getByLabelText('Sua mensagem') as HTMLInputElement).disabled).toBe(false));
 for(const question of ['Sou o Hector',...Array.from({length:7},(_,i)=>'Pergunta '+i)]){
  fireEvent.change(screen.getByLabelText('Sua mensagem'),{target:{value:question}});
  fireEvent.click(screen.getByRole('button',{name:'Enviar mensagem'}));
  await waitFor(()=>expect((screen.getByLabelText('Sua mensagem') as HTMLInputElement).disabled).toBe(false));
 }
 const body=JSON.parse(fetchSpy.mock.calls.at(-1)![1].body);
 expect(body.visitorIdentity).toBe('hector');expect(body.messages).toHaveLength(12);
 fireEvent.click(screen.getByRole('button',{name:'Limpar conversa atual'}));
 fireEvent.change(screen.getByLabelText('Sua mensagem'),{target:{value:'Oi'}});
 fireEvent.click(screen.getByRole('button',{name:'Enviar mensagem'}));
 await waitFor(()=>expect((screen.getByLabelText('Sua mensagem') as HTMLInputElement).disabled).toBe(false));
 expect(JSON.parse(fetchSpy.mock.calls.at(-1)![1].body).visitorIdentity).toBeUndefined();
});
it('switches the request and all conversation controls to English after Portuguese mode',async()=>{
 const fetchSpy=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({chat_available:true,voice_available:false})})
 .mockImplementation(async()=>({ok:true,json:async()=>({reply:'An English answer'})}));
 vi.stubGlobal('fetch',fetchSpy);const view=render(<AssistantPanel language="pt"/>);
 await waitFor(()=>expect((screen.getByLabelText('Sua mensagem') as HTMLInputElement).disabled).toBe(false));
 view.rerender(<AssistantPanel language="en"/>);
 fireEvent.change(screen.getByLabelText('Your message'),{target:{value:'Who created you?'}});
 fireEvent.click(screen.getByRole('button',{name:'Send message'}));
 await waitFor(()=>expect(fetchSpy).toHaveBeenCalledTimes(2));
 expect(JSON.parse(fetchSpy.mock.calls[1][1].body).language).toBe('en');
 expect(screen.getByRole('button',{name:'Expand conversation'})).toBeTruthy();
});
