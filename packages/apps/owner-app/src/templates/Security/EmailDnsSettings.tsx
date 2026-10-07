import { t, ActionButton, Alert, LoadingBlock } from '@homebase-id/common-app';
import { Exclamation, Refresh } from '@homebase-id/common-app/icons';
import Section from '../../components/ui/Sections/Section';
import { useDnsHealth } from '../../hooks/dns/useDnsHealth';
import { useMailHealth } from '../../hooks/mail/useMailHealth';
import { emailNeedsAttention } from './dns/attention';
import { DnsRecordsTable, MUTED } from './dns/DnsRecordRow';
import { RecordSetup } from './dns/DnsExport';
import { useDnsProvider } from './dns/providers';
import {
  isDelegated,
  isMissing,
  manualRecords as toManualRecords,
  zoneOrigin,
} from './dns/zoneFile';

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
  const broken = records.filter(isMissing);
  // Same picker as the DNS tab, remembered in the same place
  const { provider, select } = useDnsProvider();

  // Who writes the records. Homebase nameservers in use: Homebase, via Publish. NS records
  // offered but not in use: the owner's DNS host, by hand - Publish would only write a zone
  // nobody asks. No NS records: no telling, so Publish answers it (managed domains get them
  // written, anyone else gets the records back to add by hand).
  const nsRecords = (health?.records ?? []).filter((r) => r.type === 'NS');
  const thirdPartyDns = nsRecords.length > 0 && !isDelegated(nsRecords);

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

  // The outbound relay. A domain it refused has no relay rows to show as broken, which is how
  // a mailbox that could not send looked healthy here (2026-10-07). The server says so now.
  const relay = health?.relay;
  const relayProblem = relay?.problem ?? undefined;
  const needsAttention = emailNeedsAttention(health, mailHealth);
  const problems = relayProblem ? [relayProblem, ...healthErrors] : healthErrors;
  // The server words it (odin-core#1887), like the relay problem
  const warnings = relay?.warning ? [relay.warning, ...healthWarnings] : healthWarnings;

  // On DNS we do not host there is nothing for us to write, but the relay can still be asked to
  // look again - so the button is offered for a relay problem whoever hosts the DNS (#1888).
  const offerRepair = (broken.length > 0 && !thirdPartyDns) || !!relayProblem;
  const [repairLabel, repairHint] = thirdPartyDns
    ? [
        t('Check outbound sending again'),
        t('Asks the mail relay to look at your domain again. Safe to repeat.'),
      ]
    : [
        t('Repair email setup'),
        t(
          'Publishes the email records for your domain and sets up outbound sending. Safe to run more than once.'
        ),
      ];

  // After a press: records written, or (on DNS we do not host) the relay asked to verify.
  // Neither when the relay refused - that is shown on its own, in the relay's words.
  const publishedMessage = publishResult?.dnsRecordsWritten
    ? t('Records published. They can take a few minutes to appear - press Refresh to check again.')
    : publishResult && !publishResult.relayError && relay && relay.status !== 'notApplicable'
      ? t(
          'Asked the mail relay to verify your domain. It can take a few minutes - press Refresh to check again.'
        )
      : null;

  // Publishing on third-party DNS writes nothing and returns the records to add by hand,
  // matched to the check for status. Otherwise, on known third-party DNS, the check itself
  // is the list: it covers the same set Publish writes (config records, DKIM, relay).
  const manualRecords =
    toManualRecords(publishResult, records, origin) ?? (thirdPartyDns ? records : undefined);

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
              <Alert type="success">
                {isDelegated(nsRecords)
                  ? t('Your email is correctly set up (using Homebase servers, nothing to do).')
                  : t('Your email is correctly set up.')}
              </Alert>
            ) : (
              <Alert type="warning">
                {t(
                  'Your email needs attention. Mail may not be delivered or may be treated as spam until this is fixed.'
                )}
              </Alert>
            )}

            {/* Missing records are usually an identity provisioned before this server offered
                email: the records are written when an identity is created, so an older one
                never received them. The same button registers the domain with the outbound
                relay and asks it to verify, which is the repair when the relay refused it or
                has a stale verdict. Safe to repeat. Not offered for the other checks (key
                drift, DKIM pair proof): writing DNS does not fix those. */}
            {offerRepair ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-row items-center gap-3">
                  <ActionButton
                    type="primary"
                    size="none"
                    className="px-3 py-1 text-sm"
                    icon={Refresh}
                    state={publishStatus === 'pending' ? 'loading' : undefined}
                    // The failure is shown from the mutation status below; not rethrown
                    onClick={() => publishDnsRecords().catch(() => undefined)}
                  >
                    {repairLabel}
                  </ActionButton>
                  <small className={MUTED}>{repairHint}</small>
                </div>

                {/* The relay's own words: a plan limit or a bad request is something a person
                    has to change, and saying which is the whole point of the button */}
                {publishResult?.relayError ? (
                  <Alert type="warning">
                    {t('Outbound sending could not be set up:')} {publishResult.relayError}
                  </Alert>
                ) : null}

                {publishStatus === 'error' ? (
                  <Alert type="critical">
                    {t('Could not publish the records. Please try again later.')}
                  </Alert>
                ) : null}

                {/* DNS is not instant - without saying so, rows that are still red a moment
                    later read as the press having failed */}
                {publishedMessage ? <Alert type="success">{publishedMessage}</Alert> : null}
              </div>
            ) : null}

            {/* Not ours to write: the provider's steps, and its zone import where it adds
                to a zone - the domain's other records are already there. */}
            {manualRecords && origin ? (
              <RecordSetup
                records={manualRecords}
                existingZone
                origin={origin}
                provider={provider}
                onSelectProvider={select}
              />
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
            {problems.length > 0 ? (
              <CheckList title={t('Problems')} items={problems} tone="bad" />
            ) : null}
            {warnings.length > 0 ? (
              <CheckList title={t('Could not be checked')} items={warnings} tone="muted" />
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
