import { t, ActionButton, Alert, LoadingBlock } from '@homebase-id/common-app';
import { Exclamation, Refresh } from '@homebase-id/common-app/icons';
import Section from '../../components/ui/Sections/Section';
import { useDnsHealth } from '../../hooks/dns/useDnsHealth';
import { useMailHealth } from '../../hooks/mail/useMailHealth';
import { DnsRecordsTable, MUTED } from './dns/DnsRecordRow';
import { manualRecords as toManualRecords, zoneOrigin } from './dns/zoneFile';

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
  const origin = zoneOrigin(health?.records ?? [], health?.dnssec.enclosingZone);
  const broken = records.filter((r) => r.status !== 'success');

  // The checks a record comparison cannot make: the DKIM pair proof, and public-key drift
  // across WKD/DID. Deliberately the same set the monthly security health report uses - the
  // tab is where someone looks after getting that mail, so the two must not disagree.
  // Skipped entirely when there are no mail records: nothing to verify, and the check is
  // expensive (signing plus outbound HTTPS).
  const {
    fetchMailHealth: { data: mailHealth },
    publishDnsRecords: {
      mutateAsync: publishDnsRecords,
      status: publishStatus,
      data: publishResult,
    },
  } = useMailHealth({ enabled: records.length > 0 });
  const healthErrors = mailHealth?.errors ?? [];
  const healthWarnings = mailHealth?.warnings ?? [];
  const needsAttention = broken.length > 0 || healthErrors.length > 0;

  // Publishing on third-party DNS writes nothing and returns the records to add by hand.
  // They can include more than the health check covers (MTA-STS, TLS-RPT), so they replace
  // the table; status comes from the check where it has one.
  const manualRecords = toManualRecords(publishResult, records, origin);

  return (
    <>
      {error ? (
        <Alert type="critical" className="mb-4">
          {t('Could not check your email DNS right now. Please try again later.')}
        </Alert>
      ) : null}

      <Section
        title={
          <div className="flex flex-col">
            {t('Email')}
            <small className="text-sm text-gray-400">
              {t('The DNS records that make email work for your domain')}
            </small>
          </div>
        }
        actions={
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
          <p className={MUTED}>
            {health?.tenantMailEnabled
              ? t(
                  'Email is not set up for your identity yet, so there are no email DNS records to check.'
                )
              : t('This server does not offer email, so there is nothing to set up here.')}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {!needsAttention ? (
              <Alert type="success">{t('Your email is correctly set up.')}</Alert>
            ) : (
              <Alert type="warning">
                {t(
                  'Your email needs attention. Mail may not be delivered or may be treated as spam until this is fixed.'
                )}
              </Alert>
            )}

            {/* Missing records are usually an identity provisioned before this server offered
                email: the records are written when an identity is created, so an older one
                never received them. Publishing them is safe to repeat. Offered only for
                missing/incorrect RECORDS - the other checks (key drift, DKIM pair proof) are
                not fixed by writing DNS. */}
            {broken.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row items-center gap-3">
                  <ActionButton
                    type="primary"
                    size="none"
                    className="px-3 py-1 text-sm"
                    icon={Refresh}
                    state={publishStatus === 'pending' ? 'loading' : undefined}
                    onClick={() => publishDnsRecords()}
                  >
                    {t('Publish missing records')}
                  </ActionButton>
                  <small className={MUTED}>
                    {t('Adds the email records for your domain. Safe to run more than once.')}
                  </small>
                </div>

                {publishStatus === 'error' ? (
                  <Alert type="critical">
                    {t('Could not publish the records. Please try again later.')}
                  </Alert>
                ) : null}

                {/* Written, but DNS is not instant - without saying so, rows that are still
                    red a moment later read as the write having failed. */}
                {publishResult?.dnsRecordsWritten ? (
                  <Alert type="success">
                    {t(
                      'Records published. They can take a few minutes to appear - press Refresh to check again.'
                    )}
                  </Alert>
                ) : null}

                {/* Not ours to write: third-party DNS, or a host without DNS access. The
                    records are still returned, as instructions to enter by hand. */}
                {manualRecords ? (
                  <Alert type="warning">
                    {t(
                      'Your DNS is managed elsewhere, so add these records at your DNS host by hand:'
                    )}
                  </Alert>
                ) : null}
              </div>
            ) : null}

            {needsAttention ? (
              <DnsRecordsTable records={manualRecords ?? records} origin={origin} showDescription />
            ) : (
              // Working mail needs no record list in the way; it stays one click off
              <details>
                <summary className={`cursor-pointer text-sm ${MUTED}`}>{t('Show records')}</summary>
                <div className="mt-3">
                  <DnsRecordsTable records={records} origin={origin} showDescription />
                </div>
              </details>
            )}

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
            : 'bg-gray-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300'
        }`}
      >
        {tone === 'bad' ? <Exclamation className="mt-0.5 h-5 w-5 shrink-0" /> : null}
        <span>{item}</span>
      </div>
    ))}
  </div>
);

export default EmailDnsSettings;
