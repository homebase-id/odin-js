import { useState, type CSSProperties, type FC, type ReactNode } from 'react';
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

// The path as a search result prints it: "github.com › homebase-id › odin-js"
const linkCrumbs = (target: string) => {
  try {
    const segments = new URL(target).pathname.split('/').filter(Boolean).map(decode);
    return segments.length ? ` › ${segments.slice(0, 2).join(' › ')}` : '';
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

const initial = (link: CardLink) =>
  (Array.from(link.text.trim())[0] ?? Array.from(linkHost(link.target))[0] ?? '?').toUpperCase();

const FLAT: Presentation[] = ['bare', 'row'];

// Favicons are drawn for a light browser tab, so one that loads sits on a light plate in every palette
// eslint-disable-next-line react-refresh/only-export-components
export const LINKS_VARS = { '--links-favicon-plate': '#FFFFFF' } as CSSProperties;

// A wash of the accent behind the portrait, so the head of the stack has a light source
const WASH =
  'pointer-events-none absolute -top-32 left-1/2 -z-10 h-[440px] w-[640px] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--card-accent)_17%,transparent),transparent)]';

const PLATE =
  'relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full';
const TINTED_PLATE = `${PLATE} bg-[color:color-mix(in_srgb,var(--card-accent)_13%,var(--card-surface))] text-[color:var(--card-accent)]`;

// The letter is always drawn; the favicon covers it once it loads and is dropped if it does not
const Favicon = ({ link }: { link: CardLink }) => {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const src = faviconUrl(link.target);
  return (
    <span
      aria-hidden
      className={`${TINTED_PLATE} text-[15px] font-semibold transition-colors ${
        state === 'loaded'
          ? 'bg-[color:var(--links-favicon-plate)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--card-surface-ink)_10%,transparent)]'
          : ''
      }`}
    >
      <span className={state === 'loaded' ? 'invisible' : undefined}>{initial(link)}</span>
      {src && state !== 'failed' ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          data-card-optional
          onLoad={(event) => setState(event.currentTarget.naturalWidth > 1 ? 'loaded' : 'failed')}
          onError={() => setState('failed')}
          className="absolute left-1/2 top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 object-contain"
        />
      ) : null}
    </span>
  );
};

const TILE = `group flex min-w-0 items-center gap-3.5 text-start ${CARD_FOCUS}`;
const BOXED_TILE = `${TILE} rounded-[18px] bg-[var(--card-surface)] py-3 pe-4 ps-3 text-[color:var(--card-surface-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_color-mix(in_srgb,var(--card-surface-ink)_9%,transparent)] transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-[0_6px_16px_-6px_rgba(0,0,0,0.18),0_0_0_1px_color-mix(in_srgb,var(--card-surface-ink)_14%,transparent)]`;
const FLAT_TILE = `${TILE} border-t border-[color:color-mix(in_srgb,var(--card-ink)_14%,transparent)] py-3`;

const TileText = ({ title, subtitle }: { title: ReactNode; subtitle: ReactNode }) => (
  <span className="min-w-0 flex-1">
    {title}
    {subtitle}
  </span>
);

const TITLE = 'line-clamp-2 text-[15px] font-semibold leading-5 [overflow-wrap:anywhere]';
const SUBTITLE = 'mt-0.5 block truncate text-[12.5px] leading-4 text-[color:var(--card-muted)]';
const TRAIL =
  'h-3.5 w-3.5 flex-shrink-0 text-[color:var(--card-muted)] opacity-70 transition-opacity group-hover:opacity-100 [&:dir(rtl)]:-scale-x-100';

export const LinkTile = ({ link, flat }: { link: CardLink; flat: boolean }) => (
  // dir: a title in a right-to-left script turns the whole tile, favicon to its start
  <a
    href={link.target}
    target="_blank"
    rel="noopener noreferrer"
    dir="auto"
    className={flat ? FLAT_TILE : BOXED_TILE}
  >
    <Favicon link={link} />
    <TileText
      title={
        <span dir="auto" className={TITLE}>
          {link.text}
        </span>
      }
      subtitle={
        <span className={SUBTITLE}>
          <span dir="ltr">
            {linkHost(link.target)}
            <span className="opacity-80">{linkCrumbs(link.target)}</span>
          </span>
        </span>
      }
    />
    <ExternalLink aria-hidden className={TRAIL} />
  </a>
);

// Moments and chat drawn as tiles of the same build, so the list reads as one stack
const AppTile = ({
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
      <span aria-hidden className={TINTED_PLATE}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <TileText
        title={<span className={TITLE}>{label}</span>}
        subtitle={
          <span className={SUBTITLE}>
            <span dir="ltr">{detail}</span>
          </span>
        }
      />
      <Chevron aria-hidden className={TRAIL} />
    </>
  );
  return internal ? (
    <Link to={href} className={BOXED_TILE}>
      {content}
    </Link>
  ) : (
    <a href={href} className={BOXED_TILE}>
      {content}
    </a>
  );
};

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
    return (
      <ul className={`flex flex-col ${flat ? '' : 'gap-2.5'}`}>
        {data.links.filter(isUsableLink).map((link) => (
          <li key={link.id} className="min-w-0">
            <LinkTile link={link} flat={flat} />
          </li>
        ))}
      </ul>
    );
  if (block.presentation === 'boxed' && block.kind === 'moments')
    return (
      <AppTile
        icon={ImageIcon}
        label={t('Moments')}
        detail={`${data.odinId}${linkCrumbs(`https://${data.odinId}${POSTS_HREF}`)}`}
        href={POSTS_HREF}
        internal
      />
    );
  if (block.presentation === 'boxed' && block.kind === 'chat' && chatHref)
    return (
      <AppTile icon={ChatBubble} label={t('Chat with me')} detail={data.odinId} href={chatHref} />
    );
  return <CardBlock block={block} data={data} chatHref={chatHref} />;
};

const SIZES = {
  card: {
    portrait: 'h-[96px] w-[96px]',
    name: 'text-[24px]',
    host: 'text-[13px]',
    audience: 'text-[11px]',
    gap: 'mt-6',
  },
  page: {
    portrait: 'h-[132px] w-[132px]',
    name: 'text-[32px]',
    host: 'text-[15px]',
    audience: 'text-[12px]',
    gap: 'mt-8',
  },
} as const;

export const LinksProfile = ({
  design,
  data,
  size,
}: LayoutProps & { size: keyof typeof SIZES }) => {
  const sizes = SIZES[size];
  const chatHref = useChatHref(data.odinId);
  const [portrait] = design.portraits;
  const image = portrait ? portraitImage(portrait, data) : undefined;
  const blocks = design.blocks.filter(
    (block) => block.kind !== 'posts' && hasBlockContent(block.kind, data, chatHref)
  );

  return (
    <div className="relative flex w-full flex-col items-center">
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
        className={`max-w-full text-balance text-center font-semibold leading-tight ${sizes.name}`}
      />
      {data.headline ? (
        <p
          dir="auto"
          className="mt-1.5 line-clamp-3 max-w-full text-center text-[14px] leading-5 text-[color:var(--card-muted)] [overflow-wrap:anywhere]"
        >
          {data.headline}
        </p>
      ) : null}
      {ownerName(data) !== data.odinId ? (
        <p
          dir="ltr"
          className={`mt-1 max-w-full text-center text-[color:var(--card-muted)] ${sizes.host}`}
        >
          <BreakAtDots text={data.odinId} />
        </p>
      ) : null}
      <AudienceChip
        audience={data.audience}
        className={`mt-3 max-w-[min(85%,20rem)] flex-shrink-0 gap-1.5 rounded-xl bg-[color:color-mix(in_srgb,var(--card-ink)_9%,transparent)] px-2.5 py-0.5 font-medium leading-5 text-[color:var(--card-muted)] ${sizes.audience}`}
        hug
        glyphClassName="h-5 w-[1.15em]"
      />
      {blocks.length ? (
        <nav aria-label={t('Links')} className={`flex w-full flex-col gap-2.5 ${sizes.gap}`}>
          {blocks.map((block) => (
            <LinksBlock key={block.kind} block={block} data={data} chatHref={chatHref} />
          ))}
        </nav>
      ) : null}
      <CardSocials
        variant={design.socials}
        data={data}
        className={`justify-center ${blocks.length ? 'mt-6' : sizes.gap}`}
      />
    </div>
  );
};
