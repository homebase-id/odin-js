import { describe, expect, it } from 'vitest';
import { siteColorVars } from './siteColorVars';

const light = {
  'page-background': '242 245 249',
  background: '255 255 255',
  foreground: '0 0 0',
  button: '44 88 195',
  'button-text': '255 255 255',
};

describe('siteColorVars', () => {
  it('maps valid rows and derives the rest', () => {
    const css = siteColorVars(light);
    expect(css).toContain('--color-primary: 44 88 195;');
    expect(css).toContain('--color-primary-contrast: 255 255 255;');
    expect(css).toContain('--color-secondary: 235 235 235;');
    expect(css).toContain('--color-secondary-contrast: 0 0 0;');
    expect(css).not.toContain('NaN');
  });

  it.each([
    ['a missing row', undefined],
    ['an empty row', {}],
    ['a hex value', { ...light, foreground: '#ff0000' }],
    ['an injection', { ...light, foreground: '0 0 0; } body { display: none', button: 'red;}' }],
  ])('never throws or emits NaN or unsafe text for %s', (_, row) => {
    const css = siteColorVars(row);
    expect(css).not.toMatch(/NaN|#|[{}]|display|red/);
    expect(css).not.toContain('--color-secondary');
  });

  it('keeps valid keys when another is bad', () => {
    expect(siteColorVars({ ...light, button: 'nope' })).toContain('--color-background: 255 255 255;');
  });
});
