import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t, useDotYouClientContext } from '@homebase-id/common-app';
import { ChatBubble, Chevron, Globe, ImageIcon, IconProps } from '@homebase-id/common-app/icons';
import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';
import {
  CARD_FOCUS as focus,
  type BlockKind,
  type LayoutProps,
  type Presentation,
} from '../CardDesign';
import type { CardData, CardLink, CardPost } from '../useCardData';
import { POSTS_HREF } from './posts';
import { CardImg } from './CardImg';

// eslint-disable-next-line react-refresh/only-export-components
export const useChatHref = (owner: string) => {
  const client = useDotYouClientContext();
  if (client.isOwner()) return undefined;
  const loggedOn = client.getLoggedInIdentity();
  return loggedOn
    ? `${new DotYouClient({ hostIdentity: loggedOn, api: ApiType.Guest }).getRoot()}/apps/chat/open/${owner}`
    : `${import.meta.env.VITE_CENTRAL_LOGIN_HOST}/redirect/apps/chat/open/${owner}`;
};

// "https://www.github.com/homebase-id/" -> "github.com/homebase-id", as the dossier rows print it
// eslint-disable-next-line react-refresh/only-export-components
export const displayUrl = (url: string) =>
  url
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');

const Item = ({
  presentation,
  href,
  label,
  icon: Icon,
  url,
  thumbs,
  external,
  internal,
}: {
  presentation: Presentation;
  href: string;
  label: ReactNode;
  icon: FC<IconProps>;
  url?: string;
  thumbs?: CardPost[];
  external?: boolean;
  internal?: boolean;
}) => {
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  if (presentation === 'bare') {
    const className = `block border-t border-[color:var(--card-surface)] py-3 font-[family-name:var(--card-display)] text-lg ${focus}`;
    return internal ? (
      <Link to={href} className={className}>
        {label}
      </Link>
    ) : (
      <a href={href} {...linkProps} className={className}>
        {label}
      </a>
    );
  }

  if (presentation === 'button') {
    const className = `inline-flex items-center gap-2 rounded-full bg-[var(--card-ink)] px-5 py-3 font-semibold text-[color:var(--card-ground)] ${focus}`;
    const content = (
      <>
        <Icon aria-hidden className="h-5 w-5" />
        {label}
      </>
    );
    return internal ? (
      <Link to={href} className={className}>
        {content}
      </Link>
    ) : (
      <a href={href} {...linkProps} className={className}>
        {content}
      </a>
    );
  }

  if (presentation === 'row') {
    const className = `flex items-center gap-3 border-t border-[color:var(--card-surface)] py-3 ${focus}`;
    const content = (
      <>
        <Icon aria-hidden className="h-4 w-4 flex-shrink-0 text-[color:var(--card-accent)]" />
        <span className="min-w-0 flex-1">
          <span className="block">{label}</span>
          {url ? (
            <span className="block truncate text-xs text-[color:var(--card-muted)]">
              {displayUrl(url)}
            </span>
          ) : null}
        </span>
      </>
    );
    return internal ? (
      <Link to={href} className={className}>
        {content}
      </Link>
    ) : (
      <a href={href} {...linkProps} className={className}>
        {content}
      </a>
    );
  }

  // boxed
  const className = `flex items-center gap-3 rounded-xl bg-[var(--card-surface)] px-3 py-2.5 font-semibold text-[color:var(--card-surface-ink)] shadow-[0_4px_0_rgba(0,0,0,0.2)] ${focus}`;
  const content = (
    <>
      <span
        aria-hidden
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: 'color-mix(in srgb, var(--card-surface-ink) 10%, transparent)' }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {thumbs?.length ? (
        <span className="flex gap-1">
          {thumbs.map((post) =>
            post.image ? (
              <CardImg
                key={post.id}
                image={post.image}
                alt=""
                className="h-8 w-8 overflow-hidden rounded-md"
              />
            ) : null
          )}
        </span>
      ) : (
        <Chevron aria-hidden className="h-3 w-3 opacity-60" />
      )}
    </>
  );
  return internal ? (
    <Link to={href} className={className}>
      {content}
    </Link>
  ) : (
    <a href={href} {...linkProps} className={className}>
      {content}
    </a>
  );
};

// A link only counts once it has both something to say and somewhere to go, and only if it
// won't run script in the chat-kmp WebView that renders these
// eslint-disable-next-line react-refresh/only-export-components
export const isUsableLink = (link: CardLink) =>
  !!link.text && !!link.target && !/^\s*(javascript|data|vbscript):/i.test(link.target);

// Whether a block would render anything at all, so callers can drop it (and CardBlocks itself,
// or a layout's own section heading) instead of showing an empty nav or an orphaned title.
// eslint-disable-next-line react-refresh/only-export-components
export const hasBlockContent = (kind: BlockKind, data: CardData, chatHref?: string) => {
  if (kind === 'chat') return !!chatHref;
  // A phone visitor should be able to reach posts even before any post has an image
  if (kind === 'moments') return data.posts.length > 0;
  if (kind === 'links') return data.links.some(isUsableLink);
  return false; // posts are rendered by desktop pages
};

export const CardBlock = ({
  block,
  data,
  chatHref,
}: {
  block: { kind: BlockKind; presentation: Presentation };
  data: CardData;
  chatHref: string | undefined;
}) => {
  if (block.kind === 'chat')
    return chatHref ? (
      <Item
        presentation={block.presentation}
        href={chatHref}
        label={t('Chat with me')}
        icon={ChatBubble}
      />
    ) : null;

  if (block.kind === 'moments') {
    if (!data.posts.length) return null;
    // Zero thumbnails is fine: `boxed` falls back to a chevron, `row` never shows thumbs
    const thumbs = data.posts.filter((post) => post.image).slice(0, 3);
    return (
      <Item
        presentation={block.presentation}
        href={POSTS_HREF}
        label={t('Moments')}
        icon={ImageIcon}
        thumbs={thumbs}
        url={`${data.odinId}${POSTS_HREF}`}
        internal
      />
    );
  }

  if (block.kind === 'links')
    return (
      <>
        {data.links.filter(isUsableLink).map((link) => (
          <Item
            key={link.id}
            presentation={block.presentation}
            href={link.target}
            label={link.text}
            url={link.target}
            icon={Globe}
            external
          />
        ))}
      </>
    );

  return null; // posts are rendered by desktop pages
};

export const CardBlocks = ({
  design,
  data,
  kinds,
  className,
  label,
}: LayoutProps & { kinds?: BlockKind[]; className?: string; label?: string }) => {
  const chatHref = useChatHref(data.odinId);
  const blocks = design.blocks.filter(
    (b) =>
      b.kind !== 'posts' &&
      (!kinds || kinds.includes(b.kind)) &&
      hasBlockContent(b.kind, data, chatHref)
  );
  if (!blocks.length) return null;
  return (
    <nav aria-label={label ?? t('Links')} className={`flex flex-col gap-2 ${className ?? ''}`}>
      {blocks.map((block) => (
        <CardBlock key={block.kind} block={block} data={data} chatHref={chatHref} />
      ))}
    </nav>
  );
};
