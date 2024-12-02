import { FC, ReactNode, useEffect, useState } from 'react';
import { t, useLinks, useSocials, LinkType } from '@homebase-id/common-app';
import { Clipboard as ClipboardIcon, Globe, IconProps } from '@homebase-id/common-app/icons';

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
  const { data: links } = useLinks();
  const { data: socials } = useSocials();

  if (!socials || (!links && (!includeSocials || !socials))) {
    return null;
  }
  const flexDir = direction === 'col' ? 'flex-col' : 'flex-row';
  const allLinks: LinkType[] = [
    ...(includeSocials ? socials : []),
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
