// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ chat_available: false, voice_available: false }) }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('switches the full navigation to English and preserves an honest offline chat', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'EN' }));
  expect(screen.getByRole('link', { name: 'Projects' })).toBeTruthy();
  expect(document.documentElement.lang).toBe('en');
  expect(localStorage.getItem('hector-language')).toBe('en');
  expect((screen.getByLabelText('Your message') as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByText('Not connected')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(true);
});

it('opens and closes the actual portfolio project details', async () => {
  render(<App />);
  const openButton = screen.getByRole('button', { name: /Conhecer o projeto: Portfólio/ });
  await userEvent.click(openButton);
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
  expect(screen.getByText(/A assistente é um avatar animado/)).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('presents real work history and opens the Python project with its documented source link',async()=>{
 render(<App />);
 expect(screen.getByRole('heading',{name:'Auxiliar de loja'})).toBeTruthy();
 expect(screen.getByText('Edu Tintas')).toBeTruthy();
 expect(screen.getByRole('heading',{name:'Cursos complementares'})).toBeTruthy();
 await userEvent.click(screen.getByRole('button',{name:'Conhecer o projeto: HD Clientes · Edição Local'}));
 expect(screen.getByRole('dialog')).toBeTruthy();
 expect(screen.getByRole('link',{name:/Ver código/}).getAttribute('href')).toBe('https://github.com/HectorDalo/Projetos/tree/main/Projetos/Cadastro-Clientes');
});

it('shows honest skills, productivity tools and applied AI learning in both languages',async()=>{
 render(<App/>);
 expect(screen.getByRole('link',{name:'Habilidades'}).getAttribute('href')).toBe('#skills');
 expect(screen.getByRole('heading',{name:'Habilidades'})).toBeTruthy();
 expect(screen.getByText(/Criei a Elara, assistente virtual deste portfólio/)).toBeTruthy();
 expect(screen.getByText(/Google Planilhas, Documentos, Forms e Slides/)).toBeTruthy();
 expect(screen.getAllByText(/Word, Excel, PowerPoint e Access/).length).toBeGreaterThan(0);
 expect(screen.getByText('Prática inicial com orientação')).toBeTruthy();
 await userEvent.click(screen.getByRole('button',{name:'EN'}));
 expect(screen.getByRole('heading',{name:'Skills'})).toBeTruthy();
 expect(screen.getByText('Early practice with guidance')).toBeTruthy();
});

it('starts decorative effects off on a narrow touch device while keeping them available',()=>{
 vi.stubGlobal('matchMedia',(query:string)=>({matches:query==='(max-width: 760px) and (pointer: coarse)',addEventListener(){},removeEventListener(){}}));
 render(<App/>);
 const effects=screen.getByRole('button',{name:'Ativar efeitos 3D'});
 expect(effects.getAttribute('aria-pressed')).toBe('false');
});
