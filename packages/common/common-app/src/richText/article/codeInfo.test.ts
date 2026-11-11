import { describe, expect, it } from 'vitest';
import { liveBlockKind, parseCodeInfo, svgDataUri } from './codeInfo';

describe('code info strings', () => {
  it('split into language, id and wide', () => {
    expect(parseCodeInfo('html id=k3f9 wide')).toEqual({
      language: 'html',
      id: 'k3f9',
      wide: true,
    });
    expect(parseCodeInfo('react wide id=x')).toEqual({ language: 'react', id: null, wide: true });
    expect(parseCodeInfo('  ts  ')).toEqual({ language: 'ts', id: null, wide: false });
    for (const info of ['', null, undefined, 42, {}])
      expect(parseCodeInfo(info)).toEqual({ language: null, id: null, wide: false });
  });

  it('name live blocks by their first word only', () => {
    expect(liveBlockKind('html id=k3f9 wide')).toBe('html');
    expect(liveBlockKind('React id=x')).toBe('react');
    expect(liveBlockKind('mermaid')).toBe('mermaid');
    expect(liveBlockKind('svg')).toBe('svg');
    for (const info of ['jsx', 'tsx', 'ts', 'id=html', null])
      expect(liveBlockKind(info)).toBeNull();
  });

  it('make svg a data URI with nothing left unescaped', () => {
    const uri = svgDataUri('<svg onload="x()"><script>"#</script></svg>');
    expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(uri).not.toMatch(/[<>"#\s]/);
  });
});
