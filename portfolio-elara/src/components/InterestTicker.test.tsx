// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { InterestTicker } from './InterestTicker';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
it('rotates the three interests at a calm interval and keeps a stable accessible description',()=>{
  vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
  const {container}=render(<InterestTicker language="pt"/>);
  expect(container.querySelector('.interest-current')?.textContent).toBe('Criação de Soluções Digitais');
  act(()=>vi.advanceTimersByTime(4500));expect(container.querySelector('.interest-current')?.textContent).toBe('Programação');
  act(()=>vi.advanceTimersByTime(4500));expect(container.querySelector('.interest-current')?.textContent).toBe('Inteligência Artificial');
  expect(screen.getByText('Criação de Soluções Digitais, Programação, Inteligência Artificial')).toBeTruthy();
});
it('keeps interests static when reduced motion is requested',()=>{
  vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));
  const {container}=render(<InterestTicker language="en"/>);
  act(()=>vi.advanceTimersByTime(20000));expect(container.querySelector('.interest-current')?.textContent).toBe('Creating Digital Solutions');
});
