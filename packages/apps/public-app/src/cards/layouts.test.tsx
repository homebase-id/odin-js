import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { CardData } from './useCardData';
import { applyOverrides } from './overrides';
import { CARD_PRESETS } from './presets';
import { HomebaseCard } from './HomebaseCard';
import { CardSocials } from './parts/Socials';
import { CardPage } from './CardPage';
import { snapshotFilter } from './snapshotFilter';
import { resolveRequestDesign } from './resolveDesign';
import { toCardData } from './toCardData';
import renderPayloadRaw from './__fixtures__/render-payload.json?raw';
import renderPublicRaw from './__fixtures__/render-payload-public.json?raw';
import renderCircleRaw from './__fixtures__/render-payload-circle.json?raw';

const Icon = () => null;

vi.mock('@homebase-id/common-app', () => ({
  HOME_ROOT_PATH: '/home/',
  t: (text: string, ...args: unknown[]) =>
    args.reduce<string>((out, arg, i) => out.replace(`{${i}}`, String(arg)), text),
  toSocialLink: ({ type, username }: { type: string; username: string }) => ({
    type,
    link: `https://${type}.com/${username}`,
    children: username,
    icon: Icon,
  }),
  useDotYouClientContext: () => ({
    isOwner: () => false,
    getLoggedInIdentity: () => 'visitor.dotyou.cloud',
  }),
}));

// the sign-in button reads window, which the node test environment does not have
vi.mock('./parts/SignIn', () => ({ CardSignIn: () => <button type="button">Sign in</button> }));

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
  blocks: [{ kind: 'posts' }, { kind: 'chat' }, { kind: 'links' }, { kind: 'moments' }],
};
const MOMENTS_FIRST = {
  blocks: [{ kind: 'moments' }, { kind: 'links' }],
};

describe('section order override', () => {
  it.each(['poster', 'board', 'collage', 'dossier', 'links'] as const)(
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

describe('dossier chat position', () => {
  const chat = (html: string) => html.indexOf('open a chat');
  it('puts the contact row above the elsewhere rows when chat comes first', () => {
    const html = render('dossier', LINKS_FIRST);
    expect(chat(html)).toBeGreaterThan(-1);
    expect(chat(html)).toBeLessThan(html.indexOf('Shire Weekly'));
  });

  it('puts it below them when chat comes after links and moments', () => {
    const html = render('dossier', {
      blocks: [{ kind: 'links' }, { kind: 'moments' }, { kind: 'chat' }],
    });
    expect(chat(html)).toBeGreaterThan(html.indexOf('Shire Weekly'));
    expect(chat(html)).toBeGreaterThan(html.indexOf('Moments'));
  });
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

describe('links design', () => {
  const html = (node: CardData, wide = false, overrides?: unknown) => {
    const design = applyOverrides(CARD_PRESETS.links, overrides);
    return renderToStaticMarkup(
      <MemoryRouter>
        {wide ? (
          <CardPage design={design} data={node} />
        ) : (
          <HomebaseCard design={design} data={node} />
        )}
      </MemoryRouter>
    );
  };
  const withLinks = (count: number, extra: Partial<CardData> = {}) =>
    ({
      ...data,
      links: Array.from({ length: count }, (_, i) => ({
        id: `l${i}`,
        text: `Link ${i}`,
        target: `https://site${i}.example/path`,
      })),
      ...extra,
    }) as CardData;

  it.each([
    ['render-payload', renderPayloadRaw],
    ['render-payload-public', renderPublicRaw],
    ['render-payload-circle', renderCircleRaw],
  ])('%s fixture renders as links on the card and the page, with no console errors', (_n, raw) => {
    const request = JSON.parse(raw);
    const onDropped = vi.fn();
    const design = resolveRequestDesign({ ...request, design: 'links' });
    expect(design.layout).toBe('links');
    const node = toCardData(request.data, onDropped, request.audience);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warns = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const wide of [false, true]) {
      const out = renderToStaticMarkup(
        <MemoryRouter>
          {wide ? (
            <CardPage design={design} data={node} />
          ) : (
            <HomebaseCard design={design} data={node} />
          )}
        </MemoryRouter>
      );
      expect(out).toContain(request.data.odinId);
      for (const social of request.data.socials ?? [])
        expect(out).toContain(`https://${social.type}.com/${social.username}`);
      for (const link of request.data.links ?? []) {
        expect(out).toContain(link.text);
        expect(out).toContain(new URL(link.target).host);
      }
    }
    expect(onDropped).not.toHaveBeenCalled();
    // useLayoutEffect in the shared name and audience parts warns on any server render
    const real = errors.mock.calls.filter(
      ([message]) => !String(message).includes('useLayoutEffect')
    );
    expect(real).toEqual([]);
    expect(warns).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('shows favicon, title and muted domain for a link', () => {
    const out = html(data);
    expect(out).toContain('src="https://shire.example/favicon.ico"');
    expect(out).toContain('Shire Weekly');
    expect(out).toContain('>shire.example<');
  });

  it('falls back to the initial letter when the favicon cannot be built', () => {
    const odd = withLinks(0, {
      links: [{ id: 'x', text: 'zebra', target: 'mailto:z@example.com' }],
    });
    const out = html(odd);
    expect(out).not.toContain('favicon.ico');
    expect(out).toContain('>Z<');
  });

  it('draws the initial letter under an http favicon so a 404 leaves a tile', () => {
    const out = html(
      withLinks(0, { links: [{ id: 's', text: 'Site', target: 'https://example.com/a' }] })
    );
    const start = out.indexOf('<a href="https://example.com/a"');
    const tile = out.slice(start, out.indexOf('</a>', start));
    expect(tile).toContain('>S<');
    expect(tile).toContain('favicon.ico');
    expect(tile.indexOf('>S<')).toBeLessThan(tile.indexOf('<img'));
  });

  it('marks every favicon img data-card-optional for the export filter', () => {
    const imgs = html(withLinks(3)).match(/<img\b[^>]*>/g) ?? [];
    const favicons = imgs.filter((img) => img.includes('favicon.ico'));
    expect(favicons).toHaveLength(3);
    for (const img of favicons) expect(img).toContain('data-card-optional');
  });

  it('holds with no links, with 12 links, and with a very long name', () => {
    expect(html(withLinks(0), true)).toContain('Frodo');
    const twelve = html(withLinks(12));
    expect(twelve.match(/favicon\.ico/g)).toHaveLength(12);
    const long = 'Bartholomew'.repeat(12);
    expect(html(withLinks(2, { firstName: long, surName: long }), true)).toContain(long);
  });

  it('titles an unlabelled link with its site name and keeps the domain line', () => {
    const out = html(
      withLinks(0, { links: [{ id: 'u', text: '', target: 'https://www.figma.com/@frodo/work' }] })
    );
    expect(out).toContain('href="https://www.figma.com/@frodo/work"');
    expect(out).toContain('>Figma<');
    expect(out).toMatch(/dir="ltr"[^>]*>figma\.com</);
    expect(out).toContain('› @frodo');
  });

  it('drops unsafe link targets', () => {
    const out = html(
      withLinks(0, { links: [{ id: 'j', text: 'bad', target: 'javascript:alert(1)' }] })
    );
    expect(out).not.toContain('javascript:');
  });

  it('keeps right-to-left text in its own direction', () => {
    const rtl = withLinks(0, {
      firstName: 'فرودو',
      headline: 'حامل الخاتم',
      links: [{ id: 'a', text: 'نشرة الشاير', target: 'https://shire.example' }],
    });
    const out = html(rtl);
    expect(out).toMatch(/dir="auto"[^>]*>نشرة الشاير</);
    expect(out).toMatch(/dir="ltr"[^>]*>shire\.example</);
  });

  it('honours the palette and socials overrides', () => {
    const out = html(data, false, { palette: { accent: '#00FF00' }, socials: 'handles' });
    expect(out).toContain('#00FF00');
    expect(out).toContain('@frodo');
  });

  it('lists posts on the page', () => {
    expect(html(data, true)).toContain('Hello');
  });
});

describe('png export snapshot', () => {
  const node = (optional: boolean) =>
    ({
      hasAttribute: (name: string) => optional && name === 'data-card-optional',
    }) as unknown as Node;

  it('leaves optional favicons out so a failed favicon fetch cannot reject the export', () => {
    expect(snapshotFilter(node(true))).toBe(false);
    expect(snapshotFilter(node(false))).toBe(true);
    expect(snapshotFilter({ nodeType: 3 } as unknown as Node)).toBe(true);
  });
});
