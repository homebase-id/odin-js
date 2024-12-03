import { FC, ReactNode, useEffect, useState } from 'react';
import { LoadingBlock, t, useLinks, useSocials } from '@homebase-id/common-app';
import { Globe, IconProps, Clipboard as ClipboardIcon } from '@homebase-id/common-app/icons';
import Section from '../../../components/ui/Sections/Section';

export const ConnectionDetailsLinks = ({ odinId }: { odinId: string }) => {
  const { data: links, isLoading: linksLoading } = useLinks({ odinId });
  const { data: socials, isLoading: socialsLoading } = useSocials({ odinId });

  const allLinks =
    links?.map((link) => ({
      icon: Globe,
      link: link.target,
      copyText: undefined,
      priority: link.priority,
      children: link.text,
    })) || [];

  const allSocials = socials
    ? socials.map((social) => ({
        ...social,
      }))
    : [];

  const both = [...allLinks, ...allSocials].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  return (
    <Section>
      <div className="flex flex-col gap-2">
        {linksLoading && socialsLoading ? (
          <>
            <LoadingBlock className="h-12" />
            <LoadingBlock className="h-12" />
            <LoadingBlock className="h-12" />
          </>
        ) : null}
        {both?.map((link, index) => <BetterLink key={index} {...link} className={'px-4 py-3'} />)}
      </div>
    </Section>
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
    <a
      href={link}
      className={`relative flex flex-row hover:shadow-lg focus:outline-none ${
        style === 'secondary'
          ? `border-gray rounded border hover:bg-background`
          : `bg-button hover:bg-button text-button-text rounded border-0 transition-colors hover:bg-opacity-80`
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
  );
};
