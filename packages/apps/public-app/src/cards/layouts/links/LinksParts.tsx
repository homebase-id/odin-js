import { useEffect, useState, type CSSProperties, type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  ChatBubble,
  Chevron,
  ExternalLink,
  ImageIcon,
  type IconProps,
} from '@homebase-id/common-app/icons';
import { t } from '@homebase-id/common-app';
import {
  CARD_FOCUS,
  type CardDesign,
  type LayoutProps,
  type Portrait,
  type Presentation,
} from '../../CardDesign';
import { ownerName, type CardData, type CardLink } from '../../useCardData';
import { LOADED_POSTS, POSTS_HREF } from '../../parts/posts';
import { CardBlock, displayUrl, hasBlockContent, useChatHref } from '../../parts/Blocks';
import { CardPortrait, portraitImage } from '../../parts/Portrait';
import { CardSocials } from '../../parts/Socials';
import { BreakAtDots, CardName } from '../../parts/Type';
import { AudienceChip } from '../../parts/AudienceChip';

const linkHost = (target: string) => {
  try {
    return new URL(target).host.replace(/^www\./, '');
  } catch {
    return displayUrl(target).split('/')[0];
  }
};

const decode = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const pathSegments = (target: string) => {
  try {
    return new URL(target).pathname.split('/').filter(Boolean).map(decode);
  } catch {
    return [];
  }
};

// Keeps the end of a long host, where the site's own name is, and leaves room for the path
const MAX_HOST = 24;
const shortHost = (host: string) => {
  if (host.length <= MAX_HOST) return host;
  const site = host.split('.').slice(-2).join('.');
  if (site.length < host.length && site.length <= MAX_HOST - 2) return `…${site}`;
  return `${host.slice(0, 9)}…${host.slice(-(MAX_HOST - 10))}`;
};

// A link without a label still goes somewhere; its address becomes the title
// eslint-disable-next-line react-refresh/only-export-components
export const isLinkable = (link: CardLink) =>
  !!link.target?.trim() && !/^\s*(javascript|data|vbscript):/i.test(link.target);

// Cross-origin pixels cannot be read without CORS, so what is known about hosts that send none lives here:
// a black mark on transparent or a favicon.ico that decodes to nothing
const FAVICON_HINTS: Record<string, 'dark' | 'blank'> = {
  'github.com': 'dark',
  'medium.com': 'blank',
};
const hintFor = (host: string) => {
  const key = Object.keys(FAVICON_HINTS).find((h) => host === h || host.endsWith(`.${h}`));
  return key ? FAVICON_HINTS[key] : undefined;
};

type Verdict = 'ok' | 'dark' | 'failed';

// Reads the pixels when the host allows it; a CORS refusal leaves the plain load's verdict standing
const inspect = (src: string) =>
  new Promise<Verdict | undefined>((resolve) => {
    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.referrerPolicy = 'no-referrer';
    probe.onerror = () => resolve(undefined);
    probe.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) return resolve(undefined);
        context.drawImage(probe, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        let opaque = 0;
        let light = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] < 40) continue;
          opaque++;
          light += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        }
        const coverage = opaque / (size * size);
        if (coverage < 0.03) return resolve('failed');
        resolve(coverage < 0.9 && light / opaque < 70 ? 'dark' : 'ok');
      } catch {
        resolve(undefined);
      }
    };
    probe.src = src;
  });

const load = (src: string, minWidth: number) =>
  new Promise<boolean>((resolve) => {
    const image = new Image();
    image.referrerPolicy = 'no-referrer';
    image.onload = () => resolve(image.naturalWidth >= minWidth);
    image.onerror = () => resolve(false);
    image.src = src;
  });

// fill: an apple-touch-icon is an opaque, full-bleed square, so it becomes the whole well
type SiteIcon = { src: string; fill: boolean; dark: boolean } | null;

// Only the site's own icons, never a third-party favicon service that would learn who views the card
const resolveIcon = async (origin: string, host: string): Promise<SiteIcon> => {
  const touch = `${origin}/apple-touch-icon.png`;
  if (await load(touch, 120)) return { src: touch, fill: true, dark: false };
  const hint = hintFor(host);
  const ico = `${origin}/favicon.ico`;
  if (hint === 'blank' || !(await load(ico, 16))) return null;
  const verdict = (await inspect(ico)) ?? (hint === 'dark' ? 'dark' : 'ok');
  return verdict === 'failed' ? null : { src: ico, fill: false, dark: verdict === 'dark' };
};

// One answer per site for the page's lifetime, so a repeated host never resolves two ways
const pendingIcons = new Map<string, Promise<SiteIcon>>();
const settledIcons = new Map<string, SiteIcon>();
const siteOrigin = (target: string) => {
  try {
    const { protocol, host } = new URL(target);
    return protocol === 'http:' || protocol === 'https:' ? `${protocol}//${host}` : '';
  } catch {
    return '';
  }
};

const useSiteIcon = (target: string) => {
  const origin = siteOrigin(target);
  const [icon, setIcon] = useState<SiteIcon | undefined>(() =>
    origin ? settledIcons.get(origin) : null
  );
  useEffect(() => {
    if (!origin) return setIcon(null);
    if (settledIcons.has(origin)) return setIcon(settledIcons.get(origin));
    let live = true;
    let pending = pendingIcons.get(origin);
    if (!pending) {
      pending = resolveIcon(origin, linkHost(target)).then((found) => {
        settledIcons.set(origin, found);
        return found;
      });
      pendingIcons.set(origin, pending);
    }
    pending.then((found) => live && setIcon(found));
    return () => {
      live = false;
    };
  }, [origin, target]);
  return icon;
};

// Five turns, none of them zero, so an initial never reads as the accent's own well
const hueOf = (text: string) => {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return 60 + (Math.abs(hash) % 5) * 60;
};

// Each site's initial gets its own turn of the accent's hue, so a column of initials reads as
// different places. Browsers without relative colour keep the accent well
const monogramStyle = (host: string): CSSProperties => {
  const ink = `oklch(from var(--card-accent) l max(c, 0.11) calc(h + ${hueOf(host)}))`;
  return {
    color: ink,
    backgroundColor: `color-mix(in oklch, ${ink} 15%, var(--card-surface))`,
  };
};

const initial = (link: CardLink) =>
  (Array.from(link.text.trim())[0] ?? Array.from(linkHost(link.target))[0] ?? '?').toUpperCase();

const FLAT: Presentation[] = ['bare', 'row'];

// Tiles and favicon wells take their corners from the portrait, so a square portrait gets square chrome
const RADII: Record<Portrait['shape'], { tile: string; well: string; hero: string }> = {
  circle: { tile: '18px', well: '9999px', hero: '22px' },
  ellipse: { tile: '18px', well: '9999px', hero: '22px' },
  rounded: { tile: '14px', well: '12px', hero: '18px' },
  square: { tile: '6px', well: '4px', hero: '8px' },
};

const isDark = (hex: string) => {
  const value = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(value)) return false;
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
};

// eslint-disable-next-line react-refresh/only-export-components
export const linksVars = (design: CardDesign) => {
  const radii = RADII[design.portraits[0]?.shape ?? 'circle'];
  return {
    '--links-tile-radius': radii.tile,
    '--links-well-radius': radii.well,
    '--links-hero-radius': radii.hero,
    // A black mark drawn for a light browser tab turns white on a dark surface
    '--links-dark-mark': isDark(design.palette.surface) ? 'invert(1)' : 'none',
  } as CSSProperties;
};

const WASH =
  'pointer-events-none absolute -top-32 left-1/2 -z-10 h-[440px] w-[640px] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--card-accent)_17%,transparent),transparent)]';

const WELL =
  'rounded-[var(--links-well-radius)] bg-[color:color-mix(in_srgb,var(--card-accent)_12%,var(--card-surface))] text-[color:var(--card-accent)]';

// The initial is the placeholder; the icon is laid over it only once it has proven visible.
// The overlay is optional, so a PNG export drops it and keeps the initial
const Favicon = ({ link, large }: { link: CardLink; large?: boolean }) => {
  const origin = siteOrigin(link.target);
  const icon = useSiteIcon(link.target);
  // Until the site has answered, its favicon.ico waits invisibly in place
  const shown =
    icon ??
    (icon === undefined && origin
      ? { src: `${origin}/favicon.ico`, fill: false, dark: false }
      : null);
  return (
    <span
      aria-hidden
      style={monogramStyle(linkHost(link.target))}
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden font-semibold ${WELL} ${
        large ? 'h-14 w-14 text-[22px]' : 'h-10 w-10 text-[15px]'
      }`}
    >
      {initial(link)}
      {shown ? (
        <span
          data-card-optional
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${WELL} ${
            icon ? 'opacity-100' : 'opacity-0'
          } ${shown.fill ? '' : 'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--card-surface-ink)_6%,transparent)]'}`}
        >
          <img
            src={shown.src}
            alt=""
            referrerPolicy="no-referrer"
            data-card-optional
            style={shown.dark ? { filter: 'var(--links-dark-mark)' } : undefined}
            className={
              shown.fill
                ? 'h-full w-full object-cover'
                : `object-contain ${large ? 'h-8 w-8' : 'h-6 w-6'}`
            }
          />
        </span>
      ) : null}
    </span>
  );
};

// Not mirrored: a mirrored launch arrow reads as "collapse" at this size, and up-and-out reads the same in RTL
const LAUNCH =
  'h-4 w-4 flex-shrink-0 text-[color:var(--card-muted)] opacity-60 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100';
const CHEVRON =
  'h-3.5 w-3.5 flex-shrink-0 text-[color:var(--card-muted)] opacity-60 transition-opacity group-hover:opacity-100 [&:dir(rtl)]:[transform:scaleX(-1)]';

const TITLE = 'line-clamp-2 text-[15px] font-semibold leading-5 [overflow-wrap:anywhere]';
const SUBTITLE = 'mt-0.5 block text-[12.5px] leading-4 text-[color:var(--card-muted)]';

// Host and path stay left-to-right; inline, so a right-to-left tile still sets them at its start
const Where = ({ host, path }: { host?: string; path?: string }) =>
  host || path ? (
    <span className={SUBTITLE}>
      <span dir="ltr" className="inline-flex max-w-full items-baseline">
        {host ? (
          <span dir="ltr" className="flex-shrink-0">
            {host}
          </span>
        ) : null}
        {path ? (
          <span className={`min-w-0 truncate opacity-80 ${host ? 'ms-1' : ''}`}>{path}</span>
        ) : null}
      </span>
    </span>
  ) : null;

// figma.com becomes "Figma": the name a person would give the link, not its address
const siteName = (host: string) => {
  const labels = host.split('.').filter(Boolean);
  const name = labels.length > 1 ? labels[labels.length - 2] : (labels[0] ?? host);
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const describe = (link: CardLink) => {
  const host = linkHost(link.target);
  const segments = pathSegments(link.target);
  const label = link.text.trim();
  return {
    title: label || siteName(host),
    host: shortHost(host),
    path: segments[0] ? `› ${segments[0]}` : '',
    labelled: !!label,
  };
};

const LinkText = ({ link, featured }: { link: CardLink; featured?: boolean }) => {
  const { title, host, path, labelled } = describe(link);
  const size = featured
    ? 'font-[family-name:var(--card-display)] text-[20px] font-semibold leading-[26px]'
    : 'text-[15px] font-semibold leading-5';
  return (
    <span className="min-w-0 flex-1">
      <span
        dir={labelled ? 'auto' : 'ltr'}
        className={`${size} ${labelled ? 'line-clamp-2 [overflow-wrap:anywhere]' : 'block truncate'}`}
      >
        {title}
      </span>
      <Where host={host} path={path} />
    </span>
  );
};

const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

const TILE_SHADOW =
  'shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_color-mix(in_srgb,var(--card-surface-ink)_8%,transparent)]';
const TILE = `group flex min-h-[64px] min-w-0 items-center gap-3.5 rounded-[var(--links-tile-radius)] bg-[var(--card-surface)] px-3.5 py-3 text-start text-[color:var(--card-surface-ink)] ${TILE_SHADOW} transition-colors duration-150 hover:bg-[color:color-mix(in_srgb,var(--card-accent)_7%,var(--card-surface))] active:bg-[color:color-mix(in_srgb,var(--card-accent)_12%,var(--card-surface))] ${CARD_FOCUS}`;

// dir: a title in a right-to-left script turns the whole tile, favicon to its start
const FeaturedTile = ({ link }: { link: CardLink }) => (
  <a
    href={link.target}
    {...external}
    dir="auto"
    className={`group flex min-w-0 items-center gap-4 rounded-[var(--links-hero-radius)] bg-[color:color-mix(in_srgb,var(--card-accent)_9%,var(--card-surface))] px-4 py-5 text-start text-[color:var(--card-surface-ink)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--card-accent)_22%,transparent)] transition-[background-color,box-shadow] duration-150 hover:bg-[color:color-mix(in_srgb,var(--card-accent)_14%,var(--card-surface))] hover:shadow-[0_8px_22px_-12px_color-mix(in_srgb,var(--card-accent)_55%,transparent),0_0_0_1px_color-mix(in_srgb,var(--card-accent)_35%,transparent)] ${CARD_FOCUS}`}
  >
    <Favicon link={link} large />
    <LinkText link={link} featured />
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--links-well-radius)] bg-[color:var(--card-accent)] text-[color:var(--card-surface)] transition-transform duration-150 group-hover:scale-105">
      <ExternalLink aria-hidden className="h-[18px] w-[18px]" />
    </span>
  </a>
);

const LinkTile = ({ link }: { link: CardLink }) => (
  <a href={link.target} {...external} dir="auto" className={TILE}>
    <Favicon link={link} />
    <LinkText link={link} />
    <ExternalLink aria-hidden className={LAUNCH} />
  </a>
);

const FLAT_ROW = `group flex min-w-0 items-center gap-3.5 border-t border-[color:color-mix(in_srgb,var(--card-ink)_14%,transparent)] py-3 text-start ${CARD_FOCUS}`;

const LinkList = ({
  links,
  flat,
  columns,
}: {
  links: CardLink[];
  flat: boolean;
  columns?: boolean;
}) => {
  if (flat)
    return (
      <ul className="flex flex-col">
        {links.map((link) => (
          <li key={link.id} className="min-w-0">
            <a href={link.target} {...external} dir="auto" className={FLAT_ROW}>
              <Favicon link={link} />
              <LinkText link={link} />
              <ExternalLink aria-hidden className={LAUNCH} />
            </a>
          </li>
        ))}
      </ul>
    );
  const [featured, ...rest] = links;
  // An odd count lets the last tile run the full width, so the grid never ends on a lone cell
  const twoUp = columns && rest.length > 3;
  return (
    <div className="flex flex-col gap-2">
      <FeaturedTile link={featured} />
      {rest.length ? (
        <ul className={`grid gap-2 ${twoUp ? 'xl:grid-cols-2' : ''}`}>
          {rest.map((link, index) => (
            <li
              key={link.id}
              className={`grid min-w-0 ${twoUp && rest.length % 2 && index === rest.length - 1 ? 'xl:col-span-2' : ''}`}
            >
              <LinkTile link={link} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

// Moments and chat stay on this site or in the app, so they read as places, not as outbound links
const PlaceTile = ({
  icon: Icon,
  label,
  detail,
  href,
  internal,
}: {
  icon: FC<IconProps>;
  label: string;
  detail: string;
  href: string;
  internal?: boolean;
}) => {
  const content = (
    <>
      <span
        aria-hidden
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center ${WELL}`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={TITLE}>{label}</span>
        <span className={`${SUBTITLE} truncate`}>{detail}</span>
      </span>
      <Chevron aria-hidden className={CHEVRON} />
    </>
  );
  return internal ? (
    <Link to={href} className={TILE}>
      {content}
    </Link>
  ) : (
    <a href={href} className={TILE}>
      {content}
    </a>
  );
};

const momentsDetail = (data: CardData) =>
  data.posts.length < LOADED_POSTS
    ? data.posts.length === 1
      ? t('1 post')
      : t('{0} posts', data.posts.length)
    : t('Photos and posts');

const LinksBlock = ({
  block,
  data,
  chatHref,
  columns,
}: {
  block: CardDesign['blocks'][number];
  data: CardData;
  chatHref: string | undefined;
  columns?: boolean;
}) => {
  const flat = FLAT.includes(block.presentation);
  if (block.kind === 'links')
    return <LinkList links={data.links.filter(isLinkable)} flat={flat} columns={columns} />;
  if (block.presentation === 'boxed' && block.kind === 'moments')
    return (
      <PlaceTile
        icon={ImageIcon}
        label={t('Moments')}
        detail={momentsDetail(data)}
        href={POSTS_HREF}
        internal
      />
    );
  if (block.presentation === 'boxed' && block.kind === 'chat' && chatHref)
    return (
      <PlaceTile
        icon={ChatBubble}
        label={t('Chat with me')}
        detail={t('Opens Homebase Chat')}
        href={chatHref}
      />
    );
  return <CardBlock block={block} data={data} chatHref={chatHref} />;
};

const handleOf = (social: CardData['socials'][number]) =>
  typeof social.children === 'string' && social.children ? `@${social.children}` : undefined;

// Glyphs and bar become tonal buttons; handles keep each network's mark beside the name, so four
// identical handles can still be told apart. Wordmark keeps the shared build
const SocialButtons = ({ design, data, className }: LayoutProps & { className: string }) => {
  if (!data.socials.length) return null;
  if (design.socials === 'wordmark')
    return <CardSocials variant={design.socials} data={data} className={className} />;
  const handles = design.socials === 'handles';
  return (
    <ul className={`flex flex-wrap ${handles ? 'gap-2' : 'gap-3'} ${className}`}>
      {data.socials.map((social) => {
        const Icon = social.icon;
        const handle = handles ? handleOf(social) : undefined;
        const name = social.type || linkHost(social.link);
        return (
          <li key={social.link}>
            <a
              href={social.link}
              {...external}
              aria-label={handle ? `${name} ${handle}` : name}
              className={`flex items-center justify-center bg-[color:color-mix(in_srgb,var(--card-accent)_12%,transparent)] text-[color:var(--card-accent)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--card-accent)_22%,transparent)] ${CARD_FOCUS} ${
                handle
                  ? 'h-8 gap-1.5 rounded-[var(--links-tile-radius)] pe-3 ps-2.5 text-[12.5px] font-medium'
                  : 'h-10 w-10 rounded-[var(--links-well-radius)]'
              }`}
            >
              <Icon className={handle ? 'h-3.5 w-3.5 flex-shrink-0' : 'h-[18px] w-[18px]'} />
              {handle ? (
                <span dir="ltr" className="text-[color:var(--card-ink)]">
                  {handle}
                </span>
              ) : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
};

const SIZES = {
  card: {
    portrait: 'h-[96px] w-[96px]',
    name: 'text-[26px]',
    host: 'text-[13px]',
    audience: 'text-[11px]',
    audienceLines: '!line-clamp-1',
  },
  page: {
    portrait: 'h-[128px] w-[128px]',
    name: 'text-[32px]',
    host: 'text-[14px]',
    audience: 'text-[12px]',
    audienceLines: '!line-clamp-1 md:!line-clamp-2',
  },
} as const;

type Size = keyof typeof SIZES;

export const LinksIdentity = ({
  design,
  data,
  size,
  split,
}: LayoutProps & { size: Size; split?: boolean }) => {
  const sizes = SIZES[size];
  const [portrait] = design.portraits;
  const image = portrait ? portraitImage(portrait, data) : undefined;
  const align = split
    ? 'items-center text-center lg:items-start lg:text-start'
    : 'items-center text-center';
  return (
    <div className={`relative flex w-full flex-col ${align}`}>
      <div aria-hidden className={WASH} />
      {portrait && image ? (
        <CardPortrait
          portrait={portrait}
          image={image}
          alt={ownerName(data)}
          className={`mb-4 flex-shrink-0 ${sizes.portrait}`}
        />
      ) : null}
      <CardName
        design={design}
        data={data}
        inline
        className={`max-w-full text-balance font-semibold leading-tight ${sizes.name}`}
      />
      {data.headline ? (
        <p
          dir="auto"
          className="mt-2 line-clamp-3 max-w-full text-[14px] leading-5 text-[color:var(--card-muted)] [overflow-wrap:anywhere]"
        >
          {data.headline}
        </p>
      ) : null}
      {ownerName(data) !== data.odinId ? (
        <p dir="ltr" className={`mt-1 max-w-full text-[color:var(--card-muted)] ${sizes.host}`}>
          <BreakAtDots text={data.odinId} />
        </p>
      ) : null}
      <AudienceChip
        audience={data.audience}
        className={`mt-4 max-w-[min(85%,22rem)] flex-shrink-0 gap-1.5 rounded-[var(--links-tile-radius)] bg-[color:color-mix(in_srgb,var(--card-ink)_7%,transparent)] px-2.5 py-0.5 text-start font-medium leading-5 text-[color:var(--card-muted)] ${sizes.audience}`}
        textClassName={sizes.audienceLines}
        hug
        glyphClassName="h-5 w-[1.15em]"
      />
      <SocialButtons
        design={design}
        data={data}
        className={`mt-4 justify-center ${split ? 'lg:justify-start' : ''}`}
      />
    </div>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const hasLinks = (data: CardData) => data.links.some(isLinkable);

export const LinksList = ({
  design,
  data,
  skipMoments,
  emptyNote = true,
  columns,
}: LayoutProps & { skipMoments?: boolean; emptyNote?: boolean; columns?: boolean }) => {
  const chatHref = useChatHref(data.odinId);
  const blocks = design.blocks.filter(
    (block) =>
      block.kind !== 'posts' &&
      !(skipMoments && block.kind === 'moments') &&
      (block.kind === 'links' ? hasLinks(data) : hasBlockContent(block.kind, data, chatHref))
  );
  if (!blocks.length)
    return emptyNote ? (
      <p className="py-6 text-center text-[13px] text-[color:var(--card-muted)]">
        {t('No links yet')}
      </p>
    ) : null;
  return (
    <nav aria-label={t('Links')} className="flex w-full flex-col gap-3">
      {blocks.map((block) => (
        <LinksBlock
          key={block.kind}
          block={block}
          data={data}
          chatHref={chatHref}
          columns={columns}
        />
      ))}
    </nav>
  );
};
