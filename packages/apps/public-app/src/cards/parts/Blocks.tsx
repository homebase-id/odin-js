import type { FC, ReactNode } from 'react';
import { HOME_ROOT_PATH, t, useDotYouClientContext, Image } from '@homebase-id/common-app';
import { ChatBubble, Chevron, Globe, ImageIcon, IconProps } from '@homebase-id/common-app/icons';
import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';
import type { BlockKind, LayoutProps, Presentation } from '../CardDesign';
import type { CardData, CardImage } from '../useCardData';
import { postImage } from './posts';

// eslint-disable-next-line react-refresh/only-export-components
export const useChatHref = () => {
  const client = useDotYouClientContext();
  if (client.isOwner()) return undefined;
  const owner = window.location.hostname;
  const loggedOn = client.getLoggedInIdentity();
  return loggedOn
    ? `${new DotYouClient({ hostIdentity: loggedOn, api: ApiType.Guest }).getRoot()}/apps/chat/open/${owner}`
    : `${import.meta.env.VITE_CENTRAL_LOGIN_HOST}/redirect/apps/chat/open/${owner}`;
};

const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const Item = ({
  presentation,
  href,
  label,
  icon: Icon,
  url,
  thumbs,
  external,
}: {
  presentation: Presentation;
  href: string;
  label: ReactNode;
  icon: FC<IconProps>;
  url?: string;
  thumbs?: CardImage[];
  external?: boolean;
}) => {
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--card-accent)]';

  if (presentation === 'bare')
    return (
      <a href={href} {...linkProps} className={`block border-t border-[color:var(--card-surface)] py-3 font-[family-name:var(--card-display)] text-lg ${focus}`}>
        {label}
      </a>
    );

  if (presentation === 'button')
    return (
      <a href={href} {...linkProps} className={`inline-flex items-center gap-2 rounded-full bg-[var(--card-ink)] px-5 py-3 font-semibold text-[color:var(--card-ground)] ${focus}`}>
        <Icon className="h-5 w-5" />
        {label}
      </a>
    );

  if (presentation === 'row')
    return (
      <a href={href} {...linkProps} className={`flex items-center gap-3 border-t border-[color:var(--card-surface)] py-3 ${focus}`}>
        <Icon className="h-4 w-4 flex-shrink-0 text-[color:var(--card-accent)]" />
        <span className="min-w-0 flex-1">
          <span className="block">{label}</span>
          {url ? <span className="block truncate text-xs text-[color:var(--card-muted)]">{hostOf(url)}</span> : null}
        </span>
      </a>
    );

  // boxed
  return (
    <a href={href} {...linkProps} className={`flex items-center gap-3 rounded-xl bg-[var(--card-surface)] px-3 py-2.5 font-semibold text-[color:var(--card-surface-ink)] shadow-[0_4px_0_rgba(8,26,54,0.25)] ${focus}`}>
      <span
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: 'color-mix(in srgb, var(--card-surface-ink) 10%, transparent)' }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {thumbs?.length ? (
        <span className="flex gap-1">
          {thumbs.map((img) => (
            <Image key={img.fileKey} {...img} fileId={img.fileId} fileKey={img.fileKey} alt="" className="h-8 w-8 overflow-hidden rounded-md" fit="cover" />
          ))}
        </span>
      ) : (
        <Chevron className="h-3 w-3 opacity-60" />
      )}
    </a>
  );
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
      <Item presentation={block.presentation} href={chatHref} label={t('Chat with me')} icon={ChatBubble} />
    ) : null;

  if (block.kind === 'moments') {
    const thumbs = data.posts.map(postImage).filter((img): img is CardImage => !!img).slice(0, 3);
    return thumbs.length ? (
      <Item presentation={block.presentation} href={`${HOME_ROOT_PATH}posts`} label={t('Moments')} icon={ImageIcon} thumbs={thumbs} />
    ) : null;
  }

  if (block.kind === 'links')
    return (
      <>
        {data.links.map((link) => (
          <Item key={link.id} presentation={block.presentation} href={link.target} label={link.text} url={link.target} icon={Globe} external />
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
}: LayoutProps & { kinds?: BlockKind[]; className?: string }) => {
  const chatHref = useChatHref();
  const blocks = design.blocks.filter((b) => b.kind !== 'posts' && (!kinds || kinds.includes(b.kind)));
  return (
    <nav aria-label={t('Links')} className={`flex flex-col gap-2 ${className ?? ''}`}>
      {blocks.map((block) => (
        <CardBlock key={block.kind} block={block} data={data} chatHref={chatHref} />
      ))}
    </nav>
  );
};
