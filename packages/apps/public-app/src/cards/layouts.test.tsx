import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { CardData } from './useCardData';
import { applyOverrides } from './overrides';
import { CARD_PRESETS } from './presets';
import { HomebaseCard } from './HomebaseCard';
import { CardSocials } from './parts/Socials';

vi.mock('@homebase-id/common-app', () => ({
  HOME_ROOT_PATH: '/home/',
  t: (text: string, ...args: unknown[]) =>
    args.reduce<string>((out, arg, i) => out.replace(`{${i}}`, String(arg)), text),
  useDotYouClientContext: () => ({
    isOwner: () => false,
    getLoggedInIdentity: () => 'visitor.dotyou.cloud',
  }),
}));

const Icon = () => null;
const data = {
  odinId: 'frodo.dotyou.cloud',
  firstName: 'Frodo',
  links: [{ id: 'l1', text: 'Shire Weekly', target: 'https://shire.example/weekly' }],
  socials: ['twitter', 'github', 'linkedin', 'facebook', 'instagram'].map((type) => ({
    type,
    link: `https://${type}.com/frodo`,
    children: 'frodo',
    icon: Icon,
  })),
  posts: [{ id: 'p1', href: '/posts/p1', date: 1, title: 'Hello' }],
} as unknown as CardData;

const render = (layout: keyof typeof CARD_PRESETS, overrides: unknown) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <HomebaseCard design={applyOverrides(CARD_PRESETS[layout], overrides)} data={data} />
    </MemoryRouter>
  );

const order = (html: string) => ({
  links: html.indexOf('Shire Weekly'),
  moments: html.indexOf('Moments'),
});

const LINKS_FIRST = {
  blocks: [{ kind: 'posts' }, { kind: 'links' }, { kind: 'moments' }],
};
const MOMENTS_FIRST = {
  blocks: [{ kind: 'moments' }, { kind: 'links' }],
};

describe('section order override', () => {
  it.each(['poster', 'board', 'collage', 'dossier'] as const)(
    '%s card follows the order of the blocks override',
    (layout) => {
      const linksFirst = order(render(layout, LINKS_FIRST));
      const momentsFirst = order(render(layout, MOMENTS_FIRST));
      expect(linksFirst.links).toBeGreaterThan(-1);
      expect(linksFirst.moments).toBeGreaterThan(-1);
      expect(linksFirst.links).toBeLessThan(linksFirst.moments);
      expect(momentsFirst.moments).toBeLessThan(momentsFirst.links);
    }
  );
});

describe('socials variants', () => {
  const links = (html: string) => data.socials.filter((s) => html.includes(s.link)).length;

  it.each(['glyphs', 'bar', 'wordmark'] as const)('%s keeps every social', (variant) => {
    expect(links(renderToStaticMarkup(<CardSocials variant={variant} data={data} />))).toBe(5);
  });

  it('handles prints every handle', () => {
    const html = renderToStaticMarkup(<CardSocials variant="handles" data={data} />);
    expect(html.match(/@frodo/g)).toHaveLength(5);
  });

  it('wordmark names the first account and keeps the rest as glyphs', () => {
    const html = renderToStaticMarkup(<CardSocials variant="wordmark" data={data} />);
    expect(html.indexOf('twitter.com')).toBeLessThan(html.indexOf('github.com'));
    expect(html).toContain('aria-label="github"');
  });

  it('wordmark on one social renders only the box', () => {
    const one = { ...data, socials: data.socials.slice(0, 1) };
    const html = renderToStaticMarkup(<CardSocials variant="wordmark" data={one} />);
    expect(html).not.toContain('<ul');
  });
});
