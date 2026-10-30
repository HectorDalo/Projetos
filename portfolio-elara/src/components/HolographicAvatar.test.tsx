// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { HolographicAvatar } from './HolographicAvatar';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('tracks the cursor, returns to the visitor during speech, then resumes tracking',()=>{
  let frame: FrameRequestCallback=()=>{};
  vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frame=cb;return 1;});
  vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.stubGlobal('matchMedia',()=>({matches:false}));
  vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
  const state={caption:'',wordStart:0,wordLength:0};
  const {container,rerender}=render(<HolographicAvatar language="pt" performance={{...state,phase:'idle'}}/>);
  const root=container.querySelector('.avatar-stage') as HTMLDivElement;
  window.dispatchEvent(new MouseEvent('pointermove',{clientX:1000,clientY:400}));
  act(()=>{for(let i=0;i<60;i++)frame(i*16);});
  expect(Number(root.dataset.gazeX)).toBeGreaterThan(.5);
  rerender(<HolographicAvatar language="pt" performance={{...state,phase:'speaking'}}/>);
  act(()=>{for(let i=0;i<70;i++)frame(i*16);});
  expect(Number(root.dataset.gazeX)).toBe(0);
  expect(root.dataset.phase).toBe('speaking');
  rerender(<HolographicAvatar language="pt" performance={{...state,phase:'idle'}}/>);
  act(()=>{for(let i=0;i<60;i++)frame(i*16);});
  expect(Number(root.dataset.gazeX)).toBeGreaterThan(.5);
});
