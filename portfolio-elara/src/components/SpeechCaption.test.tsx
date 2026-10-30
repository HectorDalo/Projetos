// @vitest-environment jsdom
import { act, cleanup, render,fireEvent,screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SpeechCaption } from './SpeechCaption';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('keeps every word, accent and space visible across speaking highlights and at rest',()=>{
 const caption='O Hector é dedicado. Ele estuda programação e desenvolve seus projetos. '.repeat(8);
 const state={caption,phase:'speaking' as const,wordStart:90,wordLength:7};
 const view=render(<SpeechCaption language="pt" performance={state}/>);
 expect(view.container.querySelector('p')?.textContent).toBe(caption);
 view.rerender(<SpeechCaption language="pt" performance={{...state,wordStart:caption.length-5,wordLength:99}}/>);
 expect(view.container.querySelector('p')?.textContent).toBe(caption);
 view.rerender(<SpeechCaption language="pt" performance={{...state,phase:'idle'}}/>);
 expect(view.container.querySelector('p')?.textContent).toBe(caption);
 expect(view.container.querySelector('mark')).toBeNull();
});

it('keeps the reader’s scroll position when playback finishes instead of jumping back to the first word',()=>{
 const state={caption:'Uma resposta longa. '.repeat(40),phase:'speaking' as const,wordStart:80,wordLength:4};
 const view=render(<SpeechCaption language="pt" performance={state}/>);
 const box=view.container.querySelector('p')!;box.scrollTop=210;
 view.rerender(<SpeechCaption language="pt" performance={{...state,phase:'idle'}}/>);
 expect(box.scrollTop).toBe(210);
 view.rerender(<SpeechCaption language="pt" performance={{...state,caption:'Outra resposta.',phase:'idle'}}/>);
 expect(box.scrollTop).toBe(0);
});

it('pauses auto-follow during manual scrolling and resumes only when requested',()=>{
 const state={caption:'Hector estuda programação. '.repeat(30),phase:'speaking' as const,wordStart:7,wordLength:6};
 const view=render(<SpeechCaption language="pt" performance={state}/>);const box=view.container.querySelector('p')!;
 box.scrollTop=120;fireEvent.wheel(box,{deltaY:100});
 expect(screen.getByRole('button',{name:'Acompanhar fala'})).toBeTruthy();
 view.rerender(<SpeechCaption language="pt" performance={{...state,wordStart:90,wordLength:5}}/>);expect(box.scrollTop).toBe(120);
 fireEvent.click(screen.getByRole('button',{name:'Acompanhar fala'}));expect(screen.queryByRole('button',{name:'Acompanhar fala'})).toBeNull();
});

it('replaces five-word windows on mobile, preserves accents and never jumps backwards during pauses',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 const caption='O Hector é dedicado e está aprimorando conhecimentos em IA aplicada.';
 const state={caption,phase:'speaking' as const,wordStart:0,wordLength:1};
 const view=render(<SpeechCaption language="pt" performance={state}/>);
 expect(view.container.querySelector('p')?.textContent).toBe('O Hector é dedicado e');
 view.rerender(<SpeechCaption language="pt" performance={{...state,wordStart:caption.indexOf('está'),wordLength:4}}/>);
 expect(view.container.querySelector('p')?.textContent).toBe('está aprimorando conhecimentos em IA');
 expect(view.container.querySelector('mark')?.textContent).toBe('está');
 view.rerender(<SpeechCaption language="pt" performance={{...state,wordStart:0,wordLength:0}}/>);
 expect(view.container.querySelector('p')?.textContent).toBe('está aprimorando conhecimentos em IA');
 view.rerender(<SpeechCaption language="pt" performance={{...state,phase:'idle',wordStart:0,wordLength:0}}/>);
 expect(view.container.querySelector('p')?.textContent).toBe('está aprimorando conhecimentos em IA');
 view.rerender(<SpeechCaption language="pt" performance={{...state,caption:'Nova resposta completa sem áudio.',phase:'idle'}}/>);
 expect(view.container.querySelector('p')?.textContent).toBe('Nova resposta completa sem áudio.');
});
it('uses the browser speech cursor for compact English captions without inventing word highlights',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 const caption='Hector is learning applied artificial intelligence through his Elara project.';
 const view=render(<SpeechCaption language="en" performance={{caption,phase:'speaking',wordStart:0,wordLength:0,captionCursor:caption.indexOf('intelligence')}}/>);
 expect(view.container.querySelector('p')?.textContent).toBe('intelligence through his Elara project.');
 expect(view.container.querySelector('mark')).toBeNull();
});

it('shows the visitor question and Elara reply as a pair, with a thinking bubble in between',()=>{
 const base={caption:'',phase:'thinking' as const,wordStart:0,wordLength:0,turn:1,question:'Quem é o Hector?',thinking:true};
 const view=render(<SpeechCaption language="pt" performance={base}/>);
 expect(view.container.querySelector('.visitor-bubble p')?.textContent).toBe('Quem é o Hector?');
 expect(screen.getByRole('status',{name:'Elara está pensando'})).toBeTruthy();
 view.rerender(<SpeechCaption language="pt" performance={{...base,caption:'Ele estuda no ENIAC.',phase:'idle',thinking:false}}/>);
 expect(view.container.querySelector('.conversation-thread:not(.is-leaving) .conversation-caption p')?.textContent).toBe('Ele estuda no ENIAC.');
 expect(screen.queryByRole('status',{name:'Elara está pensando'})).toBeNull();
});

it('fades out the previous exchange when the next question starts',()=>{
 vi.useFakeTimers();
 const first={caption:'Ele estuda no ENIAC.',phase:'idle' as const,wordStart:0,wordLength:0,turn:1,question:'Quem é o Hector?'};
 const view=render(<SpeechCaption language="pt" performance={first}/>);
 view.rerender(<SpeechCaption language="pt" performance={{...first,caption:'',phase:'listening',turn:2,question:'',hearing:true}}/>);
 expect(view.container.querySelector('.is-leaving .visitor-bubble p')?.textContent).toBe('Quem é o Hector?');
 expect(view.container.querySelector('.conversation-thread:not(.is-leaving) .visitor-bubble p')?.textContent).toBe('Ouvindo…');
 act(()=>{vi.advanceTimersByTime(500);});
 expect(view.container.querySelector('.is-leaving')).toBeNull();
 vi.useRealTimers();
});
