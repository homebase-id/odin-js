import { FC, ReactNode } from 'react';
import { ChatBubble, Envelope, Globe, IconProps, Shield } from '@homebase-id/common-app/icons';
import { t } from '../../helpers/i18n/dictionary';
import { config } from '../../app/config';
import { Card, CardRow } from '../ui/Card/Card';
import {
  domainFromPrefixAndApex,
  primaryMailFromDomain,
  splitMailFromPrefixAndApex,
  websiteFromDomain,
} from '../../helpers/common';

interface IdentityPreviewCardProps {
  domainPrefix: string;
  apex: string;
  className?: string;
}

export const IdentityPreviewCard = ({
  domainPrefix,
  apex,
  className = '',
}: IdentityPreviewCardProps) => {
  const domain = domainFromPrefixAndApex(domainPrefix, apex);
  const isLive = !!domain;

  return (
    <Card title={t('This becomes yours')} announceChanges className={`py-2 ${className}`}>
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
    </Card>
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
  <CardRow
    isDimmed={!isLive}
    icon={
      <Icon
        className={`h-5 w-5 flex-none ${isLive ? config.accentClassName : 'text-slate-400 dark:text-slate-500'}`}
      />
    }
  >
    <span className="w-14 flex-none text-sm text-slate-500 dark:text-slate-400">{label}</span>
    <span className="min-w-0 break-all font-mono text-sm">{children}</span>
  </CardRow>
);
