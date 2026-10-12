import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { applyOverrides } from './overrides';
import { CARD_PRESETS } from './presets';
import { HomebaseCard } from './HomebaseCard';
import { CardPage } from './CardPage';
import { resolveEmbedDesign, resolveRequestDesign } from './resolveDesign';
import { toCardData } from './toCardData';
import { BLOCK_KINDS, FONT_STACKS, SHAPES, SOCIALS } from './CardDesign';
import specsRaw from './__fixtures__/design-specs.json?raw';

/*
 * __fixtures__/matrix-<design>-<public|circle>-<overrides|plain>.json and design-specs.json are written by chat-kmp
 * (CardDesignMatrixGoldenTest) from its real buildCardPayload and CardDesignSpecs.
 */

const specs = JSON.parse(specsRaw);
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
vi.mock('./parts/SignIn', () => ({ CardSignIn: () => <button type="button">Sign in</button> }));

const raws = import.meta.glob('./__fixtures__/matrix-*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

type Payload = {
  design: string;
  data: {
    odinId: string;
    photo?: { src: string };
    links: { id: string; text: string; target: string }[];
    socials: { type: string; username: string }[];
  };
  audience: { kind: 'public' | 'circle'; label?: string };
  overrides?: {
    palette: Record<string, string>;
    type: Record<string, string>;
    portraits: Record<string, unknown>[];
    blocks: { kind: string; presentation: string }[];
    socials: string;
  };
};

const fixtures = Object.entries(raws).map(([path, raw]) => {
  const [, design, audience, variant] =
    /matrix-(\w+)-(public|circle)-(overrides|plain)\.json$/.exec(path)!;
  return {
    name: `${design}/${audience}/${variant}`,
    design,
    audience,
    variant,
    payload: JSON.parse(raw) as Payload,
  };
});

const DESIGNS = ['poster', 'board', 'collage', 'dossier', 'links'];

describe('chat-kmp matrix fixtures', () => {
  it('cover every design x audience x overrides combination', () => {
    expect(fixtures).toHaveLength(DESIGNS.length * 4);
  });

  it.each(fixtures)(
    '$name: resolves to its design and drops no override field',
    ({ design, payload, variant }) => {
      const resolved = resolveRequestDesign(payload);
      expect(resolved.layout).toBe(design);
      if (variant === 'plain') {
        expect(payload.overrides).toBeUndefined();
        expect(resolved).toEqual(CARD_PRESETS[design as keyof typeof CARD_PRESETS]);
        return;
      }
      const o = payload.overrides!;
      expect(Object.keys(payload).sort()).toEqual(['audience', 'data', 'design', 'overrides']);
      expect(resolved.palette).toEqual(o.palette);
      expect(resolved.type).toEqual({ ...resolved.type, ...o.type });
      expect(resolved.type.display).toBe(o.type.display);
      expect(resolved.type.text).toBe(o.type.text);
      expect(resolved.type.label).toBe(o.type.label);
      expect(resolved.type.displayCase).toBe(o.type.displayCase);
      expect(resolved.portraits).toEqual([o.portraits[0]]);
      expect(resolved.blocks.map((b) => b.kind)).toEqual(o.blocks.map((b) => b.kind));
      for (const block of o.blocks) expect(resolved.blocks).toContainEqual(block);
      expect(resolved.socials).toBe(o.socials);
    }
  );

  it.each(fixtures)(
    '$name: renders card and page with the payload data and no console errors',
    ({ payload, design: id }) => {
      const onDropped = vi.fn();
      const design = resolveRequestDesign(payload);
      const node = toCardData(payload.data, onDropped, payload.audience);
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
        expect(out).toContain(payload.data.odinId);
        expect(out).toContain(payload.data.photo!.src);
        for (const social of payload.data.socials) expect(out).toContain(social.username);
        const linksBlock = design.blocks.some((b) => b.kind === 'links');
        // The collage page lists only the first link, in its top bar; see the it.fails below
        const shown =
          wide && id === 'collage' ? payload.data.links.slice(0, 1) : payload.data.links;
        for (const link of shown) {
          if (linksBlock) {
            expect(out).toContain(link.text);
            expect(out).toContain(new URL(link.target).host);
          }
        }
      }
      expect(onDropped).not.toHaveBeenCalled();
      expect(errors.mock.calls.filter(([m]) => !String(m).includes('useLayoutEffect'))).toEqual([]);
      expect(warns).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    }
  );

  // Known mismatch: the collage page (wide) renders only the first link, so a second link in the payload is not shown
  it.fails('collage page renders every link in the payload', () => {
    const { payload } = fixtures.find((f) => f.name === 'collage/circle/plain')!;
    const out = renderToStaticMarkup(
      <MemoryRouter>
        <CardPage
          design={resolveRequestDesign(payload)}
          data={toCardData(payload.data, () => undefined, payload.audience)}
        />
      </MemoryRouter>
    );
    for (const link of payload.data.links) expect(out).toContain(link.text);
  });

  it('circle payloads carry the circle-only link and photo, public ones only the public ones', () => {
    for (const f of fixtures) {
      const texts = f.payload.data.links.map((l) => l.text);
      if (f.audience === 'circle') {
        expect(texts).toContain('Friends only');
        expect(f.payload.data.photo?.src).toBe('data:image/jpeg;base64,friends-key');
        expect(f.payload.audience).toEqual({ kind: 'circle', label: 'Friends' });
      } else {
        expect(texts).toEqual(['Public site']);
        expect(f.payload.data.photo?.src).toBe('data:image/jpeg;base64,public-key');
        expect(f.payload.audience).toEqual({ kind: 'public' });
      }
    }
  });
});

describe('unknown design ids', () => {
  it('fall back to the default design on a render request', () => {
    for (const id of ['nope', '', 'toString', '__proto__', 'LINKS', undefined]) {
      expect(resolveRequestDesign({ design: id, overrides: { socials: 'bar' } })).toEqual(
        CARD_PRESETS.board
      );
    }
  });

  it('fall back to the default design on an embed, without applying the unknown card overrides', () => {
    const design = resolveEmbedDesign({
      card: { design: 'future-design', overrides: { socials: 'bar' } },
    });
    expect(design).toEqual(CARD_PRESETS.board);
  });
});

describe('chat-kmp CardDesignSpecs against what odin-js supports', () => {
  const ids = specs.ids as string[];
  const kotlinSpecs = specs.specs as Record<
    string,
    'none' | { options: string[]; portraitSlots: number; schemes: string[] }
  >;

  it('declares exactly the design ids odin-js has a layout for', () => {
    expect([...ids].sort()).toEqual(Object.keys(CARD_PRESETS).sort());
  });

  // Known mismatch: chat-kmp has no CardDesignSpecs entry (nor CardDesign constant) for links yet
  it.fails('declares a spec for every design id', () => {
    for (const id of ids) expect(kotlinSpecs[id], `CardDesignSpecs.of("${id}")`).not.toBe('none');
  });

  it('shares the option vocabularies', () => {
    expect(specs.fonts).toEqual(Object.keys(FONT_STACKS));
    expect(specs.portraitShapes).toEqual([...SHAPES]);
    expect(specs.socialsStyles).toEqual([...SOCIALS]);
    expect(specs.blockKinds).toEqual([...BLOCK_KINDS]);
  });

  it.each(DESIGNS)(
    '%s: each declared option and the portrait slot count is something the layout supports',
    (id) => {
      const spec = kotlinSpecs[id];
      if (spec === 'none') return;
      const preset = CARD_PRESETS[id as keyof typeof CARD_PRESETS];
      expect(spec.portraitSlots).toBe(preset.portraits.length);
      if (spec.options.includes('PORTRAIT_SHAPE'))
        expect(preset.portraits.length).toBeGreaterThan(0);
      if (spec.options.includes('BLOCK_ORDER'))
        expect(preset.blocks.map((b) => b.kind).sort()).toEqual([...BLOCK_KINDS]);
    }
  );
});

describe('links layout honours each option chat-kmp exposes for it', () => {
  const data = toCardData(
    {
      odinId: 'frodo.dotyou.cloud',
      firstName: 'Frodo',
      photo: { src: 'data:image/png;base64,AAAA' },
      links: [{ id: '1', text: 'Shire Weekly', target: 'https://shire.example/w' }],
      socials: [{ type: 'twitter', username: 'frodo' }],
    },
    () => undefined
  );
  const html = (overrides: unknown) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <HomebaseCard design={applyOverrides(CARD_PRESETS.links, overrides)} data={data} />
      </MemoryRouter>
    );

  it('colours, accent, fonts, shape, socials style', () => {
    const palette = { ground: '#112233', accent: '#ABCDEF', ink: '#F0F0F0' };
    const out = html({ palette, type: { display: 'caveat', text: 'newsreader' } });
    expect(out.toLowerCase()).toContain('#112233');
    expect(out.toLowerCase()).toContain('#abcdef');
    expect(out).toContain('Caveat');
    expect(out).toContain('Newsreader');
    expect(html({ portraits: [{ shape: 'square' }] })).toContain('--links-tile-radius:6px');
    expect(html({ portraits: [{ shape: 'ellipse' }] })).toContain('--links-tile-radius:18px');
    expect(html({ socials: 'handles' })).toContain('@frodo');
  });

  it('block order', () => {
    const out = html({ blocks: [{ kind: 'links' }] });
    expect(out).toContain('Shire Weekly');
  });
});
