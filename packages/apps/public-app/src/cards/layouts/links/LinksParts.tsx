import { useState } from 'react';
import { t } from '@homebase-id/common-app';
import { CARD_FOCUS, type LayoutProps, type Presentation } from '../../CardDesign';
import { ownerName, type CardLink } from '../../useCardData';
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

// The letter is always drawn; the favicon covers it once it loads and is dropped if it does not
const Favicon = ({ link }: { link: CardLink }) => {
  const [failed, setFailed] = useState(false);
  const src = faviconUrl(link.target);
  return (
    <span
      aria-hidden
      className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--card-accent)_14%,var(--card-surface))] text-[15px] font-semibold text-[color:var(--card-accent)]"
    >
      {initial(link)}
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          data-card-optional
          onError={() => setFailed(true)}
          className="absolute inset-1.5 h-7 w-7 rounded-full bg-[var(--card-surface)] object-contain"
        />
      ) : null}
    </span>
  );
};

export const LinkTile = ({ link, flat }: { link: CardLink; flat: boolean }) => (
  <a
    href={link.target}
    target="_blank"
    rel="noopener noreferrer"
    className={`flex min-w-0 items-center gap-3 px-3.5 py-3 text-start ${
      flat
        ? 'border-t border-[color:color-mix(in_srgb,var(--card-ink)_14%,transparent)] px-0'
        : 'rounded-2xl bg-[var(--card-surface)] text-[color:var(--card-surface-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.18),0_0_0_1px_rgba(128,128,128,0.14)]'
    } ${CARD_FOCUS}`}
  >
    <Favicon link={link} />
    <span className="min-w-0 flex-1">
      <span
        dir="auto"
        className="line-clamp-2 text-[15px] font-semibold leading-5 [overflow-wrap:anywhere]"
      >
        {link.text}
      </span>
      <span
        dir="ltr"
        className="block truncate text-[12px] leading-4 text-[color:var(--card-muted)]"
      >
        {linkHost(link.target)}
      </span>
    </span>
  </a>
);

const FLAT: Presentation[] = ['bare', 'row'];

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
    <div className="flex w-full flex-col items-center">
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
          {blocks.map((block) =>
            block.kind === 'links' ? (
              <ul key="links" className="flex flex-col gap-2.5">
                {data.links.filter(isUsableLink).map((link) => (
                  <li key={link.id} className="min-w-0">
                    <LinkTile link={link} flat={FLAT.includes(block.presentation)} />
                  </li>
                ))}
              </ul>
            ) : (
              <CardBlock key={block.kind} block={block} data={data} chatHref={chatHref} />
            )
          )}
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
