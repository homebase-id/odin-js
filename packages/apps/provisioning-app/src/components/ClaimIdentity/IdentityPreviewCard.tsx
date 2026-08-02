import { FC, ReactNode } from 'react';
import { ChatBubble, Envelope, Globe, IconProps, Shield } from '@homebase-id/common-app/icons';
import { t } from '../../helpers/i18n/dictionary';
import { config } from '../../app/config';
import {
  domainFromPrefixAndApex,
  primaryMailFromDomain,
  splitMailFromPrefixAndApex,
  websiteFromDomain,
} from '../../helpers/common';

interface IdentityPreviewCardProps {
  domainPrefix: string;
  apex: string;
  // Dimmed until there's a complete name to preview
  isLive: boolean;
  className?: string;
}

/**
 * "This becomes yours" — shows what a name actually buys the user, on both the
 * claim step (as a live preview) and the confirm step (as a recap).
 */
export const IdentityPreviewCard = ({
  domainPrefix,
  apex,
  isLive,
  className,
}: IdentityPreviewCardProps) => {
  const domain = domainFromPrefixAndApex(domainPrefix, apex);

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800 ${className ?? ''}`}
      aria-live="polite"
    >
      <p className="flex flex-row items-center gap-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {t('This becomes yours')}
        <span className="h-px flex-grow bg-slate-200 dark:bg-slate-700" />
      </p>

      <PreviewRow icon={Globe} label={t('Website')} isLive={isLive}>
        {isLive ? websiteFromDomain(domain) : <Ghost>https://…</Ghost>}
      </PreviewRow>

      <PreviewRow icon={Envelope} label={t('Email')} isLive={isLive}>
        {isLive ? (
          <>
            <span className="block">{primaryMailFromDomain(domain)}</span>
            <span className="block">{splitMailFromPrefixAndApex(domainPrefix, apex)}</span>
          </>
        ) : (
          <Ghost>{t('encrypted, end to end')}</Ghost>
        )}
      </PreviewRow>

      <PreviewRow icon={ChatBubble} label={t('Chat')} isLive={isLive}>
        {isLive ? domain : <Ghost>{t('decentralized')}</Ghost>}
      </PreviewRow>

      <PreviewRow icon={Shield} label={t('Login')} isLive={isLive}>
        {isLive ? domain : <Ghost>{t('sign in anywhere, no passwords')}</Ghost>}
      </PreviewRow>
    </div>
  );
};

const Ghost = ({ children }: { children: ReactNode }) => (
  <span className="font-sans text-slate-400 dark:text-slate-500">{children}</span>
);

const PreviewRow = ({
  icon: Icon,
  label,
  isLive,
  children,
}: {
  icon: FC<IconProps>;
  label: string;
  isLive: boolean;
  children: ReactNode;
}) => (
  <div
    className={`flex flex-row items-center gap-3 border-b border-slate-200 py-3 transition-opacity last:border-b-0 dark:border-slate-700/60 ${
      isLive ? '' : 'opacity-50'
    }`}
  >
    <Icon
      className={`h-5 w-5 flex-none ${isLive ? config.accentClassName : 'text-slate-400 dark:text-slate-500'}`}
    />
    <span className="w-14 flex-none text-sm text-slate-500 dark:text-slate-400">{label}</span>
    <span className="min-w-0 break-all font-mono text-sm">{children}</span>
  </div>
);

export default IdentityPreviewCard;
