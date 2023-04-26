import { FC, ReactNode, useEffect, useState } from 'react';
import { t } from '../../../../helpers/i18n/dictionary';
import useLinks from '../../../../hooks/links/useLinks';
import useSiteData from '../../../../hooks/siteData/useSiteData';
import { default as ClipboardIcon } from '../../Icons/Clipboard/Clipboard';
import Discord from '../../Icons/Discord/Discord';
import EpicGames from '../../Icons/EpicGames/EpicGames';
import Facebook from '../../Icons/Facebook/Facebook';
import Github from '../../Icons/Github/Github';
import Globe from '../../Icons/Globe/Globe';
import Instagram from '../../Icons/Instagram/Instagram';
import Linkedin from '../../Icons/Linkedin/Linkedin';
import Minecraft from '../../Icons/Minecraft/Minecraft';
import Person from '../../Icons/Person/Person';
import RiotGames from '../../Icons/RiotGames/RiotGames';
import Stackoverflow from '../../Icons/Stackoverflow/Stackoverflow';
import Steam from '../../Icons/Steam/Steam';
import Tiktok from '../../Icons/Tiktok/Tiktok';
import Twitter from '../../Icons/Twitter/Twitter';
import Youtube from '../../Icons/Youtube/Youtube';

const getIcon = (type: string): React.FC<IconProps> => {
  switch (type) {
    case 'facebook':
      return Facebook;
    case 'twitter':
      return Twitter;
    case 'linkedin':
      return Linkedin;
    case 'instagram':
      return Instagram;
    case 'tiktok':
      return Tiktok;
    case 'dotyouid':
      return Person;
    case 'minecraft':
      return Minecraft;
    case 'steam':
      return Steam;
    case 'discord':
      return Discord;
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

const getLink = (type: string, username: string): string => {
  if (
    ['minecraft', 'steam', 'discord', 'riot games', 'epic games', 'stackoverflow'].includes(type)
  ) {
    return '';
  }
  return type !== 'dotyouid' ? `https://${type}.com/${username}` : `https://${username}`;
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

  if (!links) {
    return null;
  }

  const flexDir = direction === 'col' ? 'flex-col' : 'flex-row';

  return (
    <div className={`-m-2 flex ${flexDir} flex-wrap ${className}`}>
      {includeSocials && (
        <>
          {siteData?.social
            ?.filter((social) => !!social.type)
            ?.map((social, index) => {
              const link = getLink(social.type, social.username);

              return (
                <BetterLink
                  key={index}
                  icon={getIcon(social.type)}
                  link={link}
                  style={style}
                  className={direction === 'col' ? 'py-3 px-4' : 'py-2 px-3'}
                  copyText={link ? undefined : social.username}
                >
                  {link ? (
                    social.username
                  ) : (
                    <div className="flex w-full flex-row">
                      @{social.username} <small className="my-auto ml-1">({social.type})</small>
                      <ClipboardIcon className="ml-auto h-5 w-5" />
                    </div>
                  )}
                </BetterLink>
              );
            })}
        </>
      )}
      {links.map((link) => (
        <BetterLink
          key={link.target}
          link={link.target}
          icon={Globe}
          style={style}
          className={direction === 'col' ? 'py-3 px-4' : 'py-2 px-3'}
        >
          {link.text}
        </BetterLink>
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
        {icon({ className: `my-auto ${style === 'secondary' ? 'mr-2' : 'mr-5'} h-4 w-4` })}
        {children}
        {isCopied && (
          <div className="absolute inset-0 z-10 flex w-full flex-row items-center justify-center">
            <span className="rounded-lg bg-background px-2 py-1 text-foreground shadow-lg">
              {t('Copied')}
            </span>
          </div>
        )}
      </a>
    </>
  );
};

export default Links;
