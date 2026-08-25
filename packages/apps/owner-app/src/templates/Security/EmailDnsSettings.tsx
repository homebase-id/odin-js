import { t, ActionButton, Alert, LoadingBlock } from '@homebase-id/common-app';
import { Check, Exclamation, Refresh } from '@homebase-id/common-app/icons';
import Section from '../../components/ui/Sections/Section';
import { useDnsHealth } from '../../hooks/dns/useDnsHealth';
import { useMailHealth } from '../../hooks/mail/useMailHealth';
import { DnsHealthRecord } from '../../provider/dns/DnsHealthProvider';

// Email DNS panel (Security tab). Read-only, like the DNS tab: fixing anything happens
// at the user's registrar or DNS host, so this says exactly what is wrong and what the
// value should be.
//
// Shares useDnsHealth with the DNS tab (same query key, 5 min stale time), so opening
// this tab costs no extra fetch. The server returns these as `mailRecords` - the
// Optional-flagged set - which never counts toward recordsAreValid, because that verdict
// gates certificate issuance.
//
// Host-wide mail infrastructure (do the MX hosts resolve, does the SPF include target
// exist) is deliberately NOT here: it is identical for every tenant and is checked at
// server boot. This panel is only about records that live in the owner's own zone.
export const EmailDnsSettings = () => {
  const {
    fetchDnsHealth: { data: health, isLoading, isRefetching, error, refetch },
  } = useDnsHealth();

  const records = health?.mailRecords ?? [];
  const broken = records.filter((r) => r.status !== 'success');

  // The checks a record comparison cannot make: the DKIM pair proof, and public-key drift
  // across WKD/DID. Deliberately the same set the monthly security health report uses - the
  // tab is where someone looks after getting that mail, so the two must not disagree.
  // Skipped entirely when there are no mail records: nothing to verify, and the check is
  // expensive (signing plus outbound HTTPS).
  const { fetchMailHealth: { data: mailHealth } } = useMailHealth({ enabled: records.length > 0 });
  const healthErrors = mailHealth?.errors ?? [];
  const healthWarnings = mailHealth?.warnings ?? [];
  const needsAttention = broken.length > 0 || healthErrors.length > 0;

  return (
    <>
      {error ? (
        <Alert type="critical" className="mb-4">
          {t('Could not check your email DNS right now. Please try again later.')}
        </Alert>
      ) : null}

      <Section
        title={
          <div className="flex w-full flex-row items-center justify-between gap-6">
            <div className="flex flex-col">
              {t('Email')}
              <small className="text-sm text-gray-400">
                {t('The DNS records that make email work for your domain')}
              </small>
            </div>
            <ActionButton
              type="secondary"
              size="none"
              className="px-3 py-1 text-sm"
              icon={Refresh}
              onClick={() => refetch()}
              state={isRefetching ? 'loading' : undefined}
            >
              {t('Refresh')}
            </ActionButton>
          </div>
        }
      >
        {isLoading ? (
          <>
            <LoadingBlock className="m-4 h-10" />
            <LoadingBlock className="m-4 h-10" />
            <LoadingBlock className="m-4 h-10" />
          </>
        ) : records.length === 0 ? (
          // Two different situations, and telling them apart is the point: one is someone
          // else's to fix, the other is the owner's.
          <p className="text-slate-500 dark:text-slate-400">
            {health?.tenantMailEnabled
              ? t('Email is not set up for your identity yet, so there are no email DNS records to check.')
              : t('This server does not offer email, so there is nothing to set up here.')}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {!needsAttention ? (
              <Alert type="success">{t('Your email is correctly set up.')}</Alert>
            ) : (
              <Alert type="warning">
                {t('Your email needs attention. Mail may not be delivered or may be treated as spam until this is fixed.')}
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              {records.map((record) => (
                <MailRecordRow key={`${record.type}-${record.domain}-${record.value}`} record={record} />
              ))}
            </div>

            {/* Errors first: these are the ones that also trigger the monthly report. */}
            {healthErrors.length > 0 ? (
              <CheckList title={t('Problems')} items={healthErrors} tone="bad" />
            ) : null}
            {healthWarnings.length > 0 ? (
              <CheckList title={t('Could not be checked')} items={healthWarnings} tone="muted" />
            ) : null}
          </div>
        )}
      </Section>
    </>
  );
};

// The non-record checks. Warnings are things we could not verify rather than things that
// are wrong, so they are visually quieter and never drive the red dot - matching the report,
// which also acts on errors only.
const CheckList = ({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'bad' | 'muted';
}) => (
  <div className="flex flex-col gap-2">
    <p className="text-lg">{title}</p>
    {items.map((item) => (
      <div
        key={item}
        className={`flex flex-row items-start gap-2 rounded-lg px-4 py-3 text-sm ${
          tone === 'bad'
            ? 'bg-orange-100 dark:bg-orange-900'
            : 'bg-gray-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300'
        }`}
      >
        {tone === 'bad' ? <Exclamation className="mt-0.5 h-5 w-5 shrink-0" /> : null}
        <span>{item}</span>
      </div>
    ))}
  </div>
);

// Status only. The owner does not fix DNS by copying values out of here - they fix it at
// their DNS host - so the row answers one question: is this record right? The description
// carries the meaning ("DKIM key (rsa)" rather than an unexplained TXT blob).
const MailRecordRow = ({ record }: { record: DnsHealthRecord }) => {
  const isGood = record.status === 'success';

  return (
    <div
      className={`flex flex-row flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-4 py-3 text-sm ${
        isGood ? 'bg-green-100 dark:bg-green-900' : 'bg-orange-100 dark:bg-orange-900'
      }`}
    >
      <span>{record.description}</span>
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
        {record.domain}. {record.type}
      </span>
      <span className="ml-auto flex flex-row items-center gap-2">
        {isGood ? (
          <Check className="h-5 w-5" />
        ) : (
          <>
            {record.status === 'incorrectValue' ? t('Incorrect value') : t('Not found')}
            <Exclamation className="h-5 w-5" />
          </>
        )}
      </span>
    </div>
  );
};

export default EmailDnsSettings;
