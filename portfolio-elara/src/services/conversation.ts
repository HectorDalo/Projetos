// A conversational self-introduction, never an authentication mechanism.
export type VisitorIdentity = 'visitor' | 'hector';
export function identifyVisitor(text: string, current: VisitorIdentity): VisitorIdentity {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const prefix = '(?:(?:oi|ola|hey|hi|elara)[,! .:–-]*)*';
  if (new RegExp('^' + prefix + '(?:eu )?nao sou (?:o )?hector\\b').test(normalized)) return 'visitor';
  return new RegExp('^' + prefix + '(?:(?:eu )?sou (?:o )?|aqui e (?:o )?|meu nome e |i am |i\\x27m )hector\\b').test(normalized) ? 'hector' : current;
}
