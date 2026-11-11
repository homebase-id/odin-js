import { describe, expect, it } from 'vitest';
import { codeLanguage } from '@homebase-id/js-lib/public';
import { liveBlockKind, svgDataUri } from './codeInfo';

describe('code info strings', () => {
  it('name live blocks by their language only', () => {
    expect(liveBlockKind(codeLanguage('html id=k3f9 wide'))).toBe('html');
    expect(liveBlockKind(codeLanguage('React id=x'))).toBe('react');
    expect(liveBlockKind('mermaid')).toBe('mermaid');
    expect(liveBlockKind('svg')).toBe('svg');
    for (const info of ['jsx', 'tsx', 'ts', 'id=html', null])
      expect(liveBlockKind(codeLanguage(info))).toBeNull();
  });

  it('make svg a data URI with nothing left unescaped', () => {
    const uri = svgDataUri('<svg onload="x()"><script>"#</script></svg>');
    expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(uri).not.toMatch(/[<>"#\s]/);
  });
});
