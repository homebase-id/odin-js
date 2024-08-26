import { FC, ReactNode, useEffect, useState } from 'react';
import { t, useSiteData } from '@homebase-id/common-app';
import { useLinks } from '../../../../hooks/links/useLinks';
import {
  Clipboard as ClipboardIcon,
  Discord,
  EpicGames,
  Facebook,
  Github,
  Globe,
  IconProps,
  Instagram,
  Snapchat,
  Linkedin,
  Minecraft,
  Person,
  RiotGames,
  Stackoverflow,
  Steam,
  Tiktok,
  Twitter,
  Youtube,
} from '@homebase-id/common-app/icons';
import { SocialFields } from '@homebase-id/js-lib/profile';

export const getLinkIcon = (type: string): React.FC<IconProps> => {
  switch (type) {
    case SocialFields.Facebook:
      return Facebook;
    case SocialFields.Twitter:
      return Twitter;
    case SocialFields.LinkedIn:
      return Linkedin;
    case SocialFields.Instagram:
      return Instagram;
    case SocialFields.Tiktok:
      return Tiktok;
    case SocialFields.Homebase:
      return Person;
    case 'minecraft':
      return Minecraft;
    case 'steam':
      return Steam;
    case 'discord':
      return Discord;
    case 'snapchat':
      return Snapchat;
    case 'youtube':
      return Youtube;
    case 'riot games':
      return RiotGames;
    case 'epic games':
      return EpicGames;
    case 'github':
      return Github;
    case 'stackoverflow':
      return Stackoverflow;
    default:
      return Globe;
  }
};

export const UNLINKABLE_SOCIALS = [
  'minecraft',
  'steam',
  'discord',
  'riot games',
  'epic games',
  'stackoverflow',
];

export const getLink = (type: string, username: string): string => {
  if (UNLINKABLE_SOCIALS.includes(type)) return '';

  return type !== 'dotyouid'
    ? `https://${type}.com/${
        type === SocialFields.LinkedIn ? 'in/' : type === SocialFields.Snapchat ? 'add/' : ''
      }${username}`
    : `https://${username}`;
};

type LinkType = {
  icon: FC<IconProps>;
  link: string;
  copyText?: string;
  priority?: number;
  children: ReactNode;
};

const Links = ({
  className,
  style,
  includeSocials,
  direction,
}: {
  className?: string;
  style?: 'secondary';
  includeSocials?: boolean;
  direction: 'col' | 'row';
}) => {
  const { data: siteData } = useSiteData();
  const { data: links } = useLinks();

  if (!siteData || (!links && (!includeSocials || !siteData?.social))) {
    return null;
  }
  const flexDir = direction === 'col' ? 'flex-col' : 'flex-row';

  const allLinks: LinkType[] = [
    ...(includeSocials && siteData.social
      ? siteData.social
          .filter((social) => !!social?.type)
          .map((social) => {
            const link = getLink(social.type, social.username);
            return {
              icon: getLinkIcon(social.type),
              link: link,
              copyText: link ? undefined : social.username,
              priority: social.priority,
              children: link ? (
                social.username
              ) : (
                <>
                  @{social.username} <small className="my-auto ml-1">({social.type})</small>
                </>
              ),
            };
          })
      : []),
    ...(links || []).map((link) => ({
      icon: Globe,
      link: link.target,
      copyText: undefined,
      priority: link.priority,
      children: link.text,
    })),
  ].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  return (
    <div className={`-m-2 flex ${flexDir} flex-wrap ${className}`}>
      {allLinks.map((link, index) => (
        <BetterLink
          key={index}
          {...link}
          style={style}
          className={direction === 'col' ? 'px-4 py-3' : 'px-3 py-2'}
        />
      ))}
    </div>
  );
};

const BetterLink = ({
  icon,
  link,
  copyText,
  children,
  style,
  className,
}: {
  icon: FC<IconProps>;
  link: string;
  copyText?: string;
  children: ReactNode;
  style?: 'secondary';
  className?: string;
}) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }, [isCopied]);

  return (
    <>
      <a
        href={link}
        className={`relative m-2 flex flex-row hover:shadow-lg focus:outline-none ${
          style === 'secondary'
            ? `border-gray rounded border hover:bg-background`
            : `rounded border-0 bg-button text-white transition-colors hover:bg-button hover:bg-opacity-80`
        } ${className ?? ''}`}
        target="_blank"
        rel={'noopener noreferrer'}
        onClick={(e) => {
          if (copyText) {
            e.preventDefault();
            setIsCopied(true);
            navigator.clipboard.writeText(copyText);
          }
        }}
      >
        {icon({ className: `my-auto ${style === 'secondary' ? 'mr-2' : 'mr-5'} h-5 w-5` })}
        {copyText ? (
          <div className="flex w-full flex-row">
            {children}
            <ClipboardIcon className="ml-auto h-5 w-5" />
          </div>
        ) : (
          children
        )}
        {isCopied && (
          <div className="absolute inset-0 z-10 flex w-full flex-row items-center justify-center">
            <span className="rounded-lg bg-background/75 px-2 py-1 text-foreground shadow-lg">
              {t('Copied')}
            </span>
          </div>
        )}
      </a>
    </>
  );
};

export default Links;
