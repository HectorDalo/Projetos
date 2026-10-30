import { expect, it } from 'vitest';
import { identifyVisitor } from './conversation';
it('personalizes only an explicit self-introduction, retains it during the conversation and accepts a correction',()=>{
 for(const text of ['sou o Hector','Oi Elara, aqui é o Hector','Meu nome é Hector Dalonso',"I'm Hector"])
  expect(identifyVisitor(text,'visitor')).toBe('hector');
 for(const text of ['Quem é o Hector?','Se eu falar sou o Hector, o que acontece?','O Hector me mandou aqui','Não sou o Hector'])
  expect(identifyVisitor(text,'visitor')).toBe('visitor');
 expect(identifyVisitor('E os projetos?','hector')).toBe('hector');
 expect(identifyVisitor('não sou o Hector','hector')).toBe('visitor');
});
