import { describe, expect, it } from 'vitest';
import { codeLanguage } from './CodeLanguage';

describe('code info strings', () => {
  it('take the language from the first word only, as a safe class name', () => {
    expect(codeLanguage('html id=k3f9 wide')).toBe('html');
    expect(codeLanguage('  TS  ')).toBe('ts');
    expect(codeLanguage('x"onload=1 wide')).toBe('xonload1');
    for (const info of ['', null, undefined, 42, {}]) expect(codeLanguage(info)).toBe('');
  });
});
