import {expect,it} from 'vitest';
import {portugueseTurn,portugueseTurnPrompt} from './conversation';
const user=(content:string)=>({role:'user' as const,content});
it('follows a short introduction, institution and languages step by step without redirecting to projects',()=>{
 expect(portugueseTurn([user('oi')],'visitor')).toBe('greeting');
 expect(portugueseTurn([user('quero saber sobre ele')],'visitor')).toBe('introduction');
 expect(portugueseTurn([{role:'assistant',content:'Ele estuda Ciência da Computação.'},user('e onde?')],'visitor')).toBe('institution');
 expect(portugueseTurn([user('o que ele já estudou?')],'visitor')).toBe('studies');
 expect(portugueseTurn([user('qual curso ele faz?')],'visitor')).toBe('course');
 expect(portugueseTurn([user('o que ele estuda?')],'visitor')).toBe('course');
 expect(portugueseTurn([user('Fale sobre os projetos dele')],'visitor')).toBeUndefined();
 expect(portugueseTurn([user('Fale sobre mim')],'visitor')).toBe('clarify_person');
 expect(portugueseTurn([user('Fale sobre mim')],'hector')).toBe('introduction');
 expect(portugueseTurnPrompt('introduction',false)).toContain('Do not describe projects');
});
