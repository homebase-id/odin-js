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
    isAuthenticated: () => false,
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
  moments: html.indexOf('Feed'),
});

const LINKS_FIRST = {
  blocks: [{ kind: 'posts' }, { kind: 'links' }, { kind: 'moments' }],
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
      expect(out.replaceAll('<wbr/>', '')).toContain(request.data.odinId);
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

describe('portrait shape', () => {
  const photo = { src: 'https://img.example/frodo.jpg' };
  const withPhoto = { ...data, photo, header: photo } as CardData;
  const draw = (layout: keyof typeof CARD_PRESETS, portraits: unknown, wide = false) => {
    const design = applyOverrides(CARD_PRESETS[layout], { portraits });
    return renderToStaticMarkup(
      <MemoryRouter>
        {wide ? (
          <CardPage design={design} data={withPhoto} />
        ) : (
          <HomebaseCard design={design} data={withPhoto} />
        )}
      </MemoryRouter>
    );
  };
  const DRAWN = ['board', 'collage', 'dossier', 'links'] as const;

  it.each(DRAWN)(
    '%s draws circle, square, rounded and ellipse as four different shapes',
    (layout) => {
      const outputs = (['circle', 'square', 'rounded', 'ellipse'] as const).map((shape) =>
        draw(layout, [{ shape }])
      );
      expect(new Set(outputs).size).toBe(4);
    }
  );

  it.each(DRAWN)('%s ellipse is a non-square box, so it cannot render as a circle', (layout) => {
    expect(draw(layout, [{ shape: 'ellipse' }])).toContain('aspect-[88/112]');
    expect(draw(layout, [{ shape: 'circle' }])).not.toContain(
      'absolute inset-y-0 left-1/2 aspect-[88/112]'
    );
  });

  it('rounded keeps a corner radius proportional to the box, not the circle radius', () => {
    const html = draw('board', [{ shape: 'rounded' }]);
    expect(html).toContain('rounded-[22%]');
    expect(html).not.toMatch(/overflow-hidden h-full w-full rounded-full/);
  });
});

describe('portrait size', () => {
  const photo = { src: 'https://img.example/frodo.jpg' };
  const withPhoto = { ...data, photo, header: photo } as CardData;
  const draw = (layout: keyof typeof CARD_PRESETS, size: unknown, wide: boolean) => {
    const design = applyOverrides(CARD_PRESETS[layout], {
      portraits: [{ source: 'photo', shape: 'circle', size }],
    });
    return renderToStaticMarkup(
      <MemoryRouter>
        {wide ? (
          <CardPage design={design} data={withPhoto} />
        ) : (
          <HomebaseCard design={design} data={withPhoto} />
        )}
      </MemoryRouter>
    );
  };
  // poster has no portrait slot, so the app never sends it a size
  const LAYOUTS = ['board', 'collage', 'dossier', 'links'] as const;

  it.each(LAYOUTS)('%s: medium is the same as no size, small and large differ', (layout) => {
    for (const wide of [false, true]) {
      const plain = draw(layout, undefined, wide);
      expect(draw(layout, 'medium', wide)).toBe(plain);
      const small = draw(layout, 'small', wide);
      const large = draw(layout, 'large', wide);
      expect(small).not.toBe(plain);
      expect(large).not.toBe(plain);
      expect(small).not.toBe(large);
    }
  });

  // The property that actually sets the portrait size on each layout; zoom does not scale percent widths
  const SIZE_PROPERTY = {
    board: {
      card: { small: 'zoom:0.8', large: 'zoom:1.25' },
      page: { small: 'zoom:0.8', large: 'zoom:1.25' },
    },
    dossier: {
      card: { small: 'zoom:0.8', large: 'zoom:1.25' },
      page: { small: 'zoom:0.8', large: 'zoom:1.25' },
    },
    links: {
      card: { small: 'zoom:0.8', large: 'zoom:1.25' },
      page: { small: 'zoom:0.8', large: 'zoom:1.25' },
    },
    collage: {
      card: { small: 'width:39.2%', large: 'width:61.25%' },
      page: { small: 'width:64%', large: 'width:100%' },
    },
  } as const;

  it.each(LAYOUTS)(
    '%s: small and large set the layout size property, medium sets neither',
    (layout) => {
      for (const wide of [false, true]) {
        const expected = SIZE_PROPERTY[layout][wide ? 'page' : 'card'];
        expect(draw(layout, 'small', wide)).toContain(expected.small);
        expect(draw(layout, 'large', wide)).toContain(expected.large);
        const medium = draw(layout, 'medium', wide);
        expect(medium).not.toContain(expected.small);
        expect(medium).not.toContain(expected.large);
      }
    }
  );

  it('collage scales the cut-out width too, and keeps it beside the print', () => {
    const two = (size: string, wide: boolean) => {
      const design = applyOverrides(CARD_PRESETS.collage, {
        portraits: [
          { source: 'photo', shape: 'square', size },
          { source: 'photo', shape: 'circle', size },
        ],
      });
      return renderToStaticMarkup(
        <MemoryRouter>
          {wide ? (
            <CardPage design={design} data={withPhoto} />
          ) : (
            <HomebaseCard design={design} data={withPhoto} />
          )}
        </MemoryRouter>
      );
    };
    expect(two('small', false)).toContain('width:30.4%');
    expect(two('large', false)).toContain('width:47.5%');
    expect(two('large', true)).toContain('margin-left:23.75%');
    expect(two('medium', true)).toContain('margin-left:39%');
  });
});

describe('links socials', () => {
  const links = (variant: string, socials = data.socials) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <HomebaseCard
          design={applyOverrides(CARD_PRESETS.links, { socials: variant })}
          data={{ ...data, socials } as CardData}
        />
      </MemoryRouter>
    );

  const lists = (html: string) =>
    [...html.matchAll(/<ul([^>]*)>(.*?)<\/ul>/g)].map((m) => ({ attrs: m[1], inner: m[2] }));
  const tokens = (attrs: string) => (attrs.match(/class="([^"]*)"/)?.[1] ?? '').split(' ');

  it('bar is one tonal pill around every network, glyphs is one tonal button each', () => {
    const bar = lists(links('bar'));
    const glyphs = lists(links('glyphs'));
    expect(bar).toHaveLength(1);
    expect(tokens(bar[0].attrs)).toEqual(expect.arrayContaining(['rounded-full', 'p-1']));
    expect(bar[0].attrs).toContain('color-mix');
    for (const s of data.socials) expect(bar[0].inner).toContain(`href="${s.link}"`);
    expect(bar[0].inner).not.toContain('h-10 w-10');

    expect(glyphs).toHaveLength(1);
    expect(tokens(glyphs[0].attrs)).not.toContain('p-1');
    expect(glyphs[0].attrs).not.toContain('color-mix');
    const buttons =
      glyphs[0].inner.match(/<a [^>]*class="[^"]*color-mix[^"]*h-10 w-10[^"]*"/g) ?? [];
    expect(buttons).toHaveLength(data.socials.length);
  });

  it.each([1, 2, 6])('wordmark draws one named tile per network (%i)', (count) => {
    const socials = [...data.socials, ...data.socials].slice(0, count).map((s, i) => ({
      ...s,
      link: `${s.link}/${i}`,
    }));
    const html = links('wordmark', socials);
    for (const s of socials) expect(html).toContain(`href="${s.link}"`);
    expect(html.match(/capitalize/g)).toHaveLength(count);
    expect(html).not.toContain('@frodo');
  });

  it('handles keep the @handle, wordmark leaves it out', () => {
    expect(links('handles').match(/>@frodo</g)).toHaveLength(5);
    expect(links('wordmark')).not.toContain('@frodo');
  });
});

describe('background tint', () => {
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lum = (c: number[]) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: number[], b: number[]) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it('paints in the accent, not the ink', () => {
    const html = render('links', { background: 'blobs' });
    expect(html).toContain('text-[color:var(--card-accent)]');
    expect(html).not.toContain('text-[color:var(--card-ink)] opacity');
  });

  it.each(Object.keys(CARD_PRESETS))('%s ink stays AA over a full-strength pattern', (layout) => {
    const { ground, ink, accent } = CARD_PRESETS[layout as keyof typeof CARD_PRESETS].palette;
    if (![ground, ink, accent].every((c) => /^#[0-9a-f]{6}$/i.test(c))) return;
    const blended = rgb(ground).map((g, i) => g * 0.86 + rgb(accent)[i] * 0.14);
    expect(contrast(rgb(ink), blended)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('socials on the shared layouts and the collage page', () => {
  const draw = (layout: keyof typeof CARD_PRESETS, socials: string, wide: boolean) => {
    const design = applyOverrides(CARD_PRESETS[layout], { socials });
    return renderToStaticMarkup(
      <MemoryRouter>
        {wide ? (
          <CardPage design={design} data={data} />
        ) : (
          <HomebaseCard design={design} data={data} />
        )}
      </MemoryRouter>
    );
  };
  const LAYOUTS = ['poster', 'board', 'collage', 'dossier'] as const;

  it.each(LAYOUTS)('%s: bar is a connected pill and glyphs are not, on card and page', (layout) => {
    for (const wide of [false, true]) {
      const socialLists = (html: string) =>
        [...html.matchAll(/<ul([^>]*data-socials[^>]*)>(.*?)<\/ul>/g)].map((m) => ({
          attrs: m[1],
          inner: m[2],
          tokens: (m[1].match(/class="([^"]*)"/)?.[1] ?? '').split(' '),
        }));
      const bar = socialLists(draw(layout, 'bar', wide));
      const glyphs = socialLists(draw(layout, 'glyphs', wide));
      expect(bar.length).toBeGreaterThan(0);
      expect(glyphs.length).toBe(bar.length);
      for (const b of bar) {
        expect(b.attrs).toContain('data-socials="bar"');
        expect(b.tokens).toEqual(expect.arrayContaining(['rounded-full', 'p-1']));
        expect(b.attrs).toContain('color-mix');
        expect(b.inner).toContain('h-9 w-9');
      }
      for (const g of glyphs) {
        expect(g.attrs).toContain('data-socials="glyphs"');
        expect(g.tokens).not.toContain('rounded-full');
        expect(g.tokens).not.toContain('p-1');
        expect(g.attrs).not.toContain('color-mix');
        expect(g.inner).not.toContain('h-9 w-9');
      }
    }
  });

  it('the collage page follows the chosen style instead of hard-coding two', () => {
    const outputs = (['glyphs', 'bar', 'wordmark', 'handles'] as const).map((s) =>
      draw('collage', s, true)
    );
    expect(new Set(outputs).size).toBe(4);
    expect(outputs[1]).toContain('data-socials="bar"');
    expect(outputs[2]).toContain('capitalize');
    expect(outputs[0]).not.toContain('capitalize');
  });
});

describe('background keeps the design colour', () => {
  const draw = (layout: keyof typeof CARD_PRESETS, overrides: object, wide: boolean) => {
    const design = applyOverrides(CARD_PRESETS[layout], overrides);
    return renderToStaticMarkup(
      <MemoryRouter>
        {wide ? (
          <CardPage design={design} data={data} />
        ) : (
          <HomebaseCard design={design} data={data} />
        )}
      </MemoryRouter>
    );
  };

  it.each(['poster', 'board', 'collage', 'dossier', 'links'] as const)(
    '%s: none renders the same as no override, card and page',
    (layout) => {
      for (const wide of [false, true]) {
        const plain = draw(layout, {}, wide);
        expect(draw(layout, { background: 'none' }, wide)).toBe(plain);
        expect(draw(layout, { background: 'default' }, wide)).toBe(plain);
      }
    }
  );

  it('a pattern layers over the links wash and the ground art', () => {
    const wash = 'radial-gradient(closest-side,color-mix(in_srgb,var(--card-accent)_17%';
    expect(draw('links', { background: 'dots' }, false)).toContain(wash);
    expect(draw('links', { background: 'dots' }, true)).toContain(wash);
    expect(draw('board', { background: 'dots' }, false)).toContain('<circle cx="-20" cy="150"');
  });
});
