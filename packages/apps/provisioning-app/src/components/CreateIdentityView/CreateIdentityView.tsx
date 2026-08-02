import { FC, useEffect, useMemo, useState } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import ActionLink from '../ui/Buttons/ActionLink';
import {
  useCanConnectToDomain,
  useCreateIdentity,
  useDomainHasValidCertificate,
} from '../../hooks/commonDomain/commonDomain';
import { Alert } from '@homebase-id/common-app';
import { Arrow, Check, Loader, Shield } from '@homebase-id/common-app/icons';
import { config } from '../../app/config';
import { AlertError } from '../ErrorAlert/ErrorAlert';

interface Props {
  domain: string;
  email: string;
  planId: string;
  invitationCode: string | null;
  // Only the managed-domain flow collects a region; the own-domain flow omits
  // it and its request stays unchanged
  region?: string | null;
  // Lets the surrounding page retitle itself once there's nothing left to wait
  // for. Optional, so the own-domain flow is unaffected.
  onProvisioned?: () => void;
}

const CreateIdentityView = ({
  domain,
  email,
  planId,
  invitationCode,
  region,
  onProvisioned,
}: Props) => {
  const { data: canConnectToPort80 } = useCanConnectToDomain(domain, 80).fetchCanConnectToDomain;
  const { data: canConnectToPort443 } = useCanConnectToDomain(domain, 443).fetchCanConnectToDomain;

  const {
    mutate: createIdentity,
    data: firstRunToken,
    status: createIdentityStatus,
    error: createIdentityError,
  } = useCreateIdentity().createIdentity;

  const {
    fetchDomainHasValidCertificate: { data: domainHasValidCertificate },
  } = useDomainHasValidCertificate(domain, createIdentityStatus !== 'idle');

  const doCreateIdentity = () => createIdentity({ domain, email, planId, invitationCode, region });
  const canProvision = canConnectToPort80 && canConnectToPort443;
  const isDone = canProvision && !!firstRunToken;

  useEffect(() => {
    if (canProvision && createIdentityStatus === 'idle') doCreateIdentity();
  }, [canConnectToPort80, canConnectToPort443]);

  useEffect(() => {
    if (isDone) onProvisioned?.();
  }, [isDone]);

  const steps = useMemo(
    () => [
      { label: t('Domain accepting connections on port 80'), isDone: !!canConnectToPort80 },
      { label: t('Domain accepting connections on port 443'), isDone: !!canConnectToPort443 },
      { label: t('Valid certificate issued'), isDone: !!domainHasValidCertificate },
      { label: t('Identity created'), isDone: !!firstRunToken },
    ],
    [canConnectToPort80, canConnectToPort443, domainHasValidCertificate, firstRunToken]
  );

  // The first unfinished step is the one currently being worked on
  const activeIndex = steps.findIndex((step) => !step.isDone);

  const summarizedState = useMemo(() => {
    if (!canConnectToPort80) return t('Waiting for your domain to come online');
    if (!canConnectToPort443) return t('Waiting for a secure connection');
    if (!domainHasValidCertificate) return t('Issuing your certificate — this can take a while');

    return t('Creating your identity');
  }, [canConnectToPort80, canConnectToPort443, domainHasValidCertificate]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <AlertError error={createIdentityError} doRetry={doCreateIdentity} />

      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {isDone ? t('Your identity is live') : t(`We're building`)}
      </p>
      <p className="mt-1 break-all font-mono text-2xl font-semibold">{domain}</p>

      {isDone ? (
        <p className="mt-2 flex flex-row items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <span aria-hidden="true" className="h-2 w-2 flex-none rounded-full bg-green-500" />
          {t('Everything is set up')} <span aria-hidden="true">🎉</span>
        </p>
      ) : (
        <p
          role="status"
          aria-live="polite"
          className="mt-2 flex flex-row items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 flex-none animate-pulse rounded-full bg-slate-400"
          />
          {summarizedState} …
        </p>
      )}

      <div
        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800"
        aria-live="polite"
      >
        <p className="flex flex-row items-center gap-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {t('Setting up')}
          <span className="h-px flex-grow bg-slate-200 dark:bg-slate-700" />
        </p>

        {steps.map((step, index) => (
          <ProgressRow
            key={step.label}
            label={step.label}
            isDone={step.isDone}
            isActive={index === activeIndex}
          />
        ))}
      </div>

      {isDone ? (
        <>
          <div className="mt-6 flex flex-col gap-3">
            <ActionLink
              className="justify-center"
              size="large"
              href={`https://${domain}/owner/firstrun?frt=${firstRunToken}`}
              icon={Arrow}
            >
              {t('Open')} {domain}
            </ActionLink>
          </div>
          <DomainAccessibleAlert domain={domain} />
        </>
      ) : (
        <p className="mt-6 flex flex-row items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <Shield className="mt-0.5 h-4 w-4 flex-none" />
          <span>
            {t('You can leave this page open — we will email')} <b>{email}</b>{' '}
            {t('the moment everything is live.')}
          </span>
        </p>
      )}
    </div>
  );
};

const ProgressRow = ({
  label,
  isDone,
  isActive,
}: {
  label: string;
  isDone: boolean;
  isActive: boolean;
}) => (
  <div
    className={`flex flex-row items-center gap-3 border-b border-slate-200 py-3 transition-opacity last:border-b-0 dark:border-slate-700/60 ${
      isDone || isActive ? '' : 'opacity-50'
    }`}
  >
    <StepIcon isDone={isDone} isActive={isActive} />
    <span className={`min-w-0 text-sm ${isDone ? '' : 'text-slate-500 dark:text-slate-400'}`}>
      {label}
    </span>
  </div>
);

const StepIcon: FC<{ isDone: boolean; isActive: boolean }> = ({ isDone, isActive }) => {
  if (isDone)
    return <Check className={`h-5 w-5 flex-none ${config.accentClassName}`} />;
  if (isActive) return <Loader className="h-5 w-5 flex-none text-slate-400" />;

  return (
    <span
      aria-hidden="true"
      className="ml-1.5 h-2 w-2 flex-none rounded-full border border-slate-300 dark:border-slate-600"
    />
  );
};

export const DomainAccessibleAlert = ({ domain }: { domain: string }) => {
  const [isPinged, setPinged] = useState<boolean>(false);
  const [accessible, setAccessible] = useState<boolean>(false);

  useEffect(() => {
    fetch(`https://${domain}/api/guest/v1/auth/ident`)
      .then((response) => response.json())
      .then((validation) => validation?.odinId.toLowerCase() === domain && setAccessible(true))
      .catch()
      .finally(() => setPinged(true));
  }, [isPinged]);

  return isPinged && !accessible ? (
    <Alert type={'info'} isCompact={true} className="mt-6 text-left">
      <p>
        {t(
          `Although we have confirmed that your domain and identity is correctly setup and provisioned. Your identity might not be accessible yet, as it can take up to 24 hours for the DNS records to propagate.`
        )}
      </p>
    </Alert>
  ) : null;
};

export default CreateIdentityView;
