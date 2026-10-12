import { useEffect, useState, type CSSProperties, type FC, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ChatBubble,
  Chevron,
  ExternalLink,
  ImageIcon,
  type IconProps,
} from '@homebase-id/common-app/icons';
import { t } from '@homebase-id/common-app';
import { CARD_FOCUS, type CardDesign, type LayoutProps, type Presentation } from '../../CardDesign';
import { ownerName, type CardData, type CardLink } from '../../useCardData';
import { POSTS_HREF } from '../../parts/posts';
import {
  CardBlock,
  displayUrl,
  hasBlockContent,
  isUsableLink,
  useChatHref,
} from '../../parts/Blocks';
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

// Only the first segment, so the muted line names where it goes and never ends in an ellipsis
const linkCrumb = (target: string) => {
  try {
    const [first] = new URL(target).pathname.split('/').filter(Boolean).map(decode);
    return first ? ` › ${first}` : '';
  } catch {
    return '';
  }
};

const faviconUrl = (target: string) => {
  try {
    const { protocol, host } = new URL(target);
    return protocol === 'http:' || protocol === 'https:' ? `${protocol}//${host}/favicon.ico` : '';
  } catch {
    return '';
  }
};

// Cross-origin pixels cannot be read without CORS, so what is known about hosts that send none lives here:
// a black mark on transparent (needs a light plate) or a favicon.ico that decodes to nothing
const FAVICON_HINTS: Record<string, 'dark' | 'blank'> = {
  'github.com': 'dark',
  'medium.com': 'blank',
};
const hintFor = (target: string) => {
  const host = linkHost(target);
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

const initial = (link: CardLink) =>
  (Array.from(link.text.trim())[0] ?? Array.from(linkHost(link.target))[0] ?? '?').toUpperCase();

const FLAT: Presentation[] = ['bare', 'row'];

// A black favicon on transparent is drawn for a light browser tab; only those get this plate
// eslint-disable-next-line react-refresh/only-export-components
export const LINKS_VARS = { '--links-favicon-plate': '#FFFFFF' } as CSSProperties;

const WASH =
  'pointer-events-none absolute -top-32 left-1/2 -z-10 h-[440px] w-[640px] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--card-accent)_17%,transparent),transparent)]';

const QUIET_PLATE =
  'bg-[color:color-mix(in_srgb,var(--card-surface-ink)_6%,var(--card-surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--card-surface-ink)_12%,transparent)]';
const DARK_MARK_PLATE =
  'bg-[color:var(--links-favicon-plate)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--card-surface-ink)_12%,transparent)]';
const TINT =
  'bg-[color:color-mix(in_srgb,var(--card-accent)_14%,var(--card-surface))] text-[color:var(--card-accent)]';

// The tinted initial is the placeholder; the favicon is laid over it only once it has proven visible.
// The overlay is optional, so a PNG export drops it and keeps the initial
const Favicon = ({ link, large }: { link: CardLink; large?: boolean }) => {
  const src = faviconUrl(link.target);
  const hint = hintFor(link.target);
  const [verdict, setVerdict] = useState<Verdict | 'pending'>(
    !src || hint === 'blank' ? 'failed' : 'pending'
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded || verdict !== 'pending') return;
    let live = true;
    inspect(src).then((seen) => live && setVerdict(seen ?? (hint === 'dark' ? 'dark' : 'ok')));
    return () => {
      live = false;
    };
  }, [loaded, verdict, src, hint]);

  const shown = verdict === 'ok' || verdict === 'dark';
  return (
    <span
      aria-hidden
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${TINT} ${
        large ? 'h-14 w-14 text-[20px]' : 'h-10 w-10 text-[15px]'
      }`}
    >
      {initial(link)}
      {verdict !== 'failed' ? (
        <span
          data-card-optional
          className={`absolute inset-0 flex items-center justify-center rounded-full transition-opacity duration-200 ${
            shown ? 'opacity-100' : 'opacity-0'
          } ${verdict === 'dark' ? DARK_MARK_PLATE : QUIET_PLATE}`}
        >
          <img
            src={src}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            data-card-optional
            onLoad={(event) =>
              event.currentTarget.naturalWidth < 16 ? setVerdict('failed') : setLoaded(true)
            }
            onError={() => setVerdict('failed')}
            className="h-[60%] w-[60%] object-contain"
          />
        </span>
      ) : null}
    </span>
  );
};

// Not mirrored: a mirrored launch arrow reads as "collapse" at this size, and up-and-out reads the same in RTL
const LAUNCH =
  'h-3.5 w-3.5 flex-shrink-0 text-[color:var(--card-muted)] opacity-70 transition-opacity group-hover:opacity-100';
const CHEVRON =
  'h-3 w-3 flex-shrink-0 text-[color:var(--card-muted)] opacity-70 [&:dir(rtl)]:[transform:scaleX(-1)]';

const TITLE = 'line-clamp-2 text-[15px] font-semibold leading-5 [overflow-wrap:anywhere]';
const SUBTITLE = 'mt-0.5 block truncate text-[12.5px] leading-4 text-[color:var(--card-muted)]';

const Where = ({ target }: { target: string }) => (
  <span className={SUBTITLE}>
    <span dir="ltr">
      <span dir="ltr">{linkHost(target)}</span>
      <span className="opacity-80">{linkCrumb(target)}</span>
    </span>
  </span>
);

const SURFACE =
  'bg-[var(--card-surface)] text-[color:var(--card-surface-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_color-mix(in_srgb,var(--card-surface-ink)_9%,transparent)]';
const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

// dir: a title in a right-to-left script turns the whole tile, favicon to its start
const FeaturedTile = ({ link }: { link: CardLink }) => (
  <a
    href={link.target}
    {...external}
    dir="auto"
    className={`group relative flex flex-col gap-4 overflow-hidden rounded-[24px] bg-[color:color-mix(in_srgb,var(--card-accent)_9%,var(--card-surface))] p-5 text-start text-[color:var(--card-surface-ink)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--card-accent)_22%,transparent)] transition-shadow duration-150 hover:shadow-[0_8px_22px_-10px_color-mix(in_srgb,var(--card-accent)_55%,transparent),0_0_0_1px_color-mix(in_srgb,var(--card-accent)_35%,transparent)] ${CARD_FOCUS}`}
  >
    <span className="flex items-start justify-between gap-3">
      <Favicon link={link} large />
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--card-accent)_14%,transparent)]">
        <ExternalLink aria-hidden className="h-3.5 w-3.5 text-[color:var(--card-accent)]" />
      </span>
    </span>
    <span className="min-w-0">
      <span
        dir="auto"
        className="line-clamp-2 font-[family-name:var(--card-display)] text-[21px] font-semibold leading-7 [overflow-wrap:anywhere]"
      >
        {link.text}
      </span>
      <Where target={link.target} />
    </span>
  </a>
);

const ROW = `group flex min-h-[64px] min-w-0 items-center gap-3.5 ps-4 text-start ${CARD_FOCUS}`;
// The divider starts at the text, as grouped lists draw it
const ROW_BODY =
  'flex min-h-[64px] min-w-0 flex-1 items-center gap-3 py-3 pe-4 [li+li_&]:border-t [li+li_&]:border-[color:color-mix(in_srgb,var(--card-surface-ink)_10%,transparent)]';

const RowText = ({ title, subtitle }: { title: ReactNode; subtitle: ReactNode }) => (
  <span className="min-w-0 flex-1">
    {title}
    {subtitle}
  </span>
);

const LinkRow = ({ link }: { link: CardLink }) => (
  <a href={link.target} {...external} dir="auto" className={ROW}>
    <Favicon link={link} />
    <span className={ROW_BODY}>
      <RowText
        title={
          <span dir="auto" className={TITLE}>
            {link.text}
          </span>
        }
        subtitle={<Where target={link.target} />}
      />
      <ExternalLink aria-hidden className={LAUNCH} />
    </span>
  </a>
);

const FLAT_ROW = `group flex min-w-0 items-center gap-3.5 border-t border-[color:color-mix(in_srgb,var(--card-ink)_14%,transparent)] py-3 text-start ${CARD_FOCUS}`;

const GROUP = `overflow-hidden rounded-[20px] ${SURFACE}`;

const LinkList = ({ links, flat }: { links: CardLink[]; flat: boolean }) => {
  if (flat)
    return (
      <ul className="flex flex-col">
        {links.map((link) => (
          <li key={link.id} className="min-w-0">
            <a href={link.target} {...external} dir="auto" className={FLAT_ROW}>
              <Favicon link={link} />
              <RowText
                title={
                  <span dir="auto" className={TITLE}>
                    {link.text}
                  </span>
                }
                subtitle={<Where target={link.target} />}
              />
              <ExternalLink aria-hidden className={LAUNCH} />
            </a>
          </li>
        ))}
      </ul>
    );
  const [featured, ...rest] = links;
  return (
    <div className="flex flex-col gap-3">
      <FeaturedTile link={featured} />
      {rest.length ? (
        <ul className={GROUP}>
          {rest.map((link) => (
            <li key={link.id} className="min-w-0">
              <LinkRow link={link} />
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
  const className = `${GROUP} ${ROW} transition-shadow`;
  const content = (
    <>
      <span
        aria-hidden
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] ${TINT}`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className={ROW_BODY}>
        <RowText
          title={<span className={TITLE}>{label}</span>}
          subtitle={<span className={SUBTITLE}>{detail}</span>}
        />
        <Chevron aria-hidden className={CHEVRON} />
      </span>
    </>
  );
  return internal ? (
    <Link to={href} className={className}>
      {content}
    </Link>
  ) : (
    <a href={href} className={className}>
      {content}
    </a>
  );
};

const LOADED_CAP = 12;
const momentsDetail = (data: CardData) =>
  data.posts.length < LOADED_CAP
    ? data.posts.length === 1
      ? t('1 post')
      : t('{0} posts', data.posts.length)
    : t('Photos and posts');

const LinksBlock = ({
  block,
  data,
  chatHref,
}: {
  block: CardDesign['blocks'][number];
  data: CardData;
  chatHref: string | undefined;
}) => {
  const flat = FLAT.includes(block.presentation);
  if (block.kind === 'links')
    return <LinkList links={data.links.filter(isUsableLink)} flat={flat} />;
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

// The two variants that draw glyphs become tonal buttons; handles and wordmark keep their own build
const SocialButtons = ({ design, data, className }: LayoutProps & { className: string }) => {
  if (design.socials !== 'glyphs' && design.socials !== 'bar')
    return <CardSocials variant={design.socials} data={data} className={className} />;
  if (!data.socials.length) return null;
  return (
    <ul className={`flex flex-wrap gap-3 ${className}`}>
      {data.socials.map((social) => {
        const Icon = social.icon;
        return (
          <li key={social.link}>
            <a
              href={social.link}
              {...external}
              aria-label={social.type || linkHost(social.link)}
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--card-accent)_12%,transparent)] text-[color:var(--card-accent)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--card-accent)_22%,transparent)] ${CARD_FOCUS}`}
            >
              <Icon className="h-[18px] w-[18px]" />
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
  },
  page: {
    portrait: 'h-[128px] w-[128px]',
    name: 'text-[32px]',
    host: 'text-[14px]',
    audience: 'text-[12px]',
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
          className={`mb-5 flex-shrink-0 ${sizes.portrait}`}
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
        className={`mt-3 max-w-[min(85%,20rem)] flex-shrink-0 gap-1.5 rounded-xl bg-[color:color-mix(in_srgb,var(--card-ink)_8%,transparent)] px-2.5 py-0.5 text-start font-medium leading-5 text-[color:var(--card-muted)] ${sizes.audience}`}
        hug
        glyphClassName="h-5 w-[1.15em]"
      />
      <SocialButtons
        design={design}
        data={data}
        className={`mt-5 justify-center ${split ? 'lg:justify-start' : ''}`}
      />
    </div>
  );
};

export const LinksList = ({
  design,
  data,
  skipMoments,
  emptyNote = true,
}: LayoutProps & { skipMoments?: boolean; emptyNote?: boolean }) => {
  const chatHref = useChatHref(data.odinId);
  const blocks = design.blocks.filter(
    (block) =>
      block.kind !== 'posts' &&
      !(skipMoments && block.kind === 'moments') &&
      hasBlockContent(block.kind, data, chatHref)
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
        <LinksBlock key={block.kind} block={block} data={data} chatHref={chatHref} />
      ))}
    </nav>
  );
};
