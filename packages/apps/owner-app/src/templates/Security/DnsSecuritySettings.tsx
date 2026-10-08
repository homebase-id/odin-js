import { ReactNode, useState } from 'react';
import { t, ActionButton, Alert, LoadingBlock } from '@homebase-id/common-app';
import { Refresh } from '@homebase-id/common-app/icons';
import { NameserverSetup, RecordSetup } from './dns/DnsExport';
import {
  CopyIconButton,
  DnsRecordsTable,
  MUTED as MUTED_BASE,
  TABLE_CARD,
  TABLE_HEAD_BASE,
} from './dns/DnsRecordRow';
import { isDelegated, isMissing, requiredRecords, zoneOrigin } from './dns/zoneFile';
import { dnssecNotGreen, enclosingZoneIncomplete, parentZone } from './dns/dnssec';
import { DnsProvider, useDnsProvider } from './dns/providers';
import Section from '../../components/ui/Sections/Section';
import { useDnsHealth } from '../../hooks/dns/useDnsHealth';
import {
  DnsHealthRecord,
  DnssecHealth,
  DsRecord,
  OptionalDnsRecord,
} from '../../provider/dns/DnsHealthProvider';

type Mode = 'nameservers' | 'records';

type View = 'delegated' | 'good' | 'nameservers' | 'records';

const MUTED = `text-sm ${MUTED_BASE}`;

// DNS health panel (Security tab): required-record status, the optional www record and
// the DNSSEC chain of trust. Read-only - fixing anything happens at the user's
// registrar/DNS host; this panel tells them exactly what and where.
export const DnsSecuritySettings = () => {
  const {
    fetchDnsHealth: { data: health, isLoading, isRefetching, error, refetch },
  } = useDnsHealth();

  // One choice for the whole panel: the setup steps and the DNSSEC hint follow it
  const { provider, select } = useDnsProvider();
  // Nameservers is the default when Homebase can host the zone; data arrives async, so the
  // owner's choice is only stored once made
  const [chosen, setChosen] = useState<Mode>();
  const records = health?.records ?? [];
  const nsRecords = records.filter((r) => r.type === 'NS');
  // Without NS records there is no nameserver path, whatever was chosen before a Refresh
  const mode: Mode = nsRecords.length ? (chosen ?? 'nameservers') : 'records';
  const { shown, zone } = requiredRecords(records);
  const origin = zoneOrigin(records, health?.dnssec.enclosingZone);
  // Exactly one view, so the setup block is always first and the page does not jump
  const view: View = isDelegated(nsRecords)
    ? 'delegated'
    : !shown.some(isMissing)
      ? 'good'
      : mode === 'nameservers' && origin
        ? 'nameservers'
        : 'records';
  // Optional records stay out of the nameserver setup only; every other view shows them
  const showingNameservers = view === 'nameservers';
  // Anything not green opens the record list, so what is wrong is on screen without a click
  const expandRecords =
    shown.some(isMissing) ||
    nsRecords.some(isMissing) ||
    (!!health && dnssecNotGreen(health.dnssec));

  return (
    <>
      {error ? (
        <Alert type="critical" className="mb-4">
          {t('Could not check your DNS right now. Please try again later.')}
        </Alert>
      ) : null}

      <Section
        title={
          <div className="flex flex-col">
            {t('DNS')}
            <small className="text-sm text-gray-400">
              {t('The DNS records and DNSSEC state of your domain')}
            </small>
          </div>
        }
        actions={
          // "Refresh", not "Verify": the check already runs when the tab opens
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
        ) : health ? (
          <div className="flex flex-col gap-6">
            <RecordsBlock
              view={view}
              nsRecords={nsRecords}
              expand={expandRecords}
              shown={shown}
              zone={zone}
              origin={origin}
              onModeChange={setChosen}
              provider={provider}
              onSelectProvider={select}
            />
            <OptionalRecordsBlock
              optionalRecords={health.optionalRecords}
              show={view !== 'delegated' && !showingNameservers}
            />
            <DnssecBlock dnssec={health.dnssec} provider={provider} origin={origin} />
          </div>
        ) : null}
      </Section>
    </>
  );
};

// Every view offers the full record list - including the NS rows, graded against the parent's
// delegation, because "uses Homebase nameservers" is itself a claim the owner may need to check
const AllRecords = ({
  records,
  origin,
  expand,
}: {
  records: DnsHealthRecord[];
  origin: string;
  expand: boolean;
}) => (
  <details open={expand}>
    <summary className={`cursor-pointer ${MUTED}`}>{t('Show records')}</summary>
    <div className="mt-3">
      <DnsRecordsTable records={records} origin={origin} />
    </div>
  </details>
);

const RecordsBlock = ({
  view,
  nsRecords,
  expand,
  shown: visibleRecords,
  zone: zoneRecords,
  origin,
  onModeChange,
  provider,
  onSelectProvider,
}: {
  view: View;
  nsRecords: DnsHealthRecord[];
  expand: boolean;
  shown: DnsHealthRecord[];
  zone: DnsHealthRecord[];
  origin: string;
  onModeChange: (mode: Mode) => void;
  provider: DnsProvider;
  onSelectProvider: (id: string) => void;
}) => {
  const allRecords = [...nsRecords, ...visibleRecords];
  if (view === 'delegated') {
    // Delegated means the NS rows check out; the other records can still be wrong
    const recordsOk = !visibleRecords.some(isMissing);
    return (
      <div className="flex flex-col gap-3">
        {recordsOk ? (
          <Alert type="success">
            {t('Your DNS is correctly set up (using Homebase servers, nothing to do).')}
          </Alert>
        ) : (
          <Alert type="warning">
            {t(
              'Your domain uses Homebase servers, but some records are missing or wrong. Press Refresh in a few minutes; if it persists, contact support.'
            )}
          </Alert>
        )}
        <AllRecords records={allRecords} origin={origin} expand={expand} />
      </div>
    );
  }
  if (view === 'good') {
    return (
      <div className="flex flex-col gap-3">
        <Alert type="success">{t('Your DNS records are set up correctly.')}</Alert>
        {/* Own DNS host: the Homebase NS rows are not the owner's setup, so they would only read as "Not found" */}
        <AllRecords records={visibleRecords} origin={origin} expand={expand} />
      </div>
    );
  }
  if (view === 'nameservers') {
    return (
      <div className="flex flex-col gap-4">
        <NameserverSetup
          nsRecords={nsRecords}
          origin={origin}
          provider={provider}
          onSelectProvider={onSelectProvider}
          onUseRecords={() => onModeChange('records')}
        />
        <AllRecords records={allRecords} origin={origin} expand={false} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {origin ? (
        <RecordSetup
          records={zoneRecords}
          origin={origin}
          provider={provider}
          onSelectProvider={onSelectProvider}
          onUseNameservers={nsRecords.length ? () => onModeChange('nameservers') : undefined}
        />
      ) : null}
      <DnsRecordsTable records={visibleRecords} origin={origin} />
    </div>
  );
};

const OptionalRecordsBlock = ({
  optionalRecords,
  show,
}: {
  optionalRecords: OptionalDnsRecord[];
  show: boolean;
}) => {
  // A www that already works needs no mention; the line only explains odd states
  const notable = optionalRecords.filter((record) => record.status !== 'success');
  if (!show || !notable.length) return null;
  return (
    <div className="flex flex-col gap-1">
      {notable.map((record) => (
        <p key={record.domain} className={MUTED}>
          <span className="font-mono">{record.domain}</span> -{' '}
          {record.status === 'notSet'
            ? t("optional, not set - that's fine")
            : t('optional, not pointing at your identity - fine if intentional')}
        </p>
      ))}
    </div>
  );
};

const DnssecBlock = ({
  dnssec,
  provider,
  origin,
}: {
  dnssec: DnssecHealth;
  provider: DnsProvider;
  origin: string;
}) => {
  // A lookup nobody answered says nothing about the zone: not a finding, just "try again"
  if (dnssec.lookupFailed)
    return (
      <p className={MUTED}>
        {t('DNSSEC: could not be checked right now. Press Refresh to try again.')}
      </p>
    );
  if (dnssec.status === 'secure')
    return <p className={MUTED}>{t('DNSSEC: fully active, with an unbroken chain of trust.')}</p>;
  if (dnssec.status === 'inherited') {
    if (dnssec.breaksResolution)
      return (
        <Alert type="critical">
          {t('DNSSEC for the')} <span className="font-mono">{dnssec.enclosingZone}</span>{' '}
          {t(
            'zone your domain is part of is broken, and validating DNS resolvers cannot resolve your domain. This is on our side - we are looking into it.'
          )}
        </Alert>
      );
    if (enclosingZoneIncomplete(dnssec))
      return (
        <Alert type="warning">
          {t('DNSSEC for the')} <span className="font-mono">{dnssec.enclosingZone}</span>{' '}
          {t(
            'zone your domain is part of is not complete. This is on our side - nothing for you to do.'
          )}
        </Alert>
      );
    return (
      <p className={MUTED}>
        {/* Not necessarily Homebase's zone: id.example.com can sit in the owner's own
            example.com zone, wherever that is hosted */}
        {t('DNSSEC: set for the')} <span className="font-mono">{dnssec.enclosingZone}</span>{' '}
        {t('zone your domain is part of, nothing to do.')}
      </p>
    );
  }
  if (dnssec.status === 'zoneUnsigned')
    return (
      <div className="flex flex-col gap-3">
        <DnssecMissing>
          {t(
            'Your DNS host does not sign your zone. Turn on DNSSEC (zone signing) at your DNS host, then add the DS record it gives you at your registrar. Or use Homebase nameservers, which sign it for you.'
          )}
        </DnssecMissing>
        <DsHint provider={provider} />
      </div>
    );
  if (dnssec.status === 'parentUnsigned')
    // The zone is signed, so the DS is already known; it just has nowhere to go yet
    return (
      <div className="flex flex-col gap-3">
        <DnssecMissing>
          {t('Your zone is signed, but its parent zone')}{' '}
          <span className="font-mono">{parentZone(origin)}</span>{' '}
          {t(
            'is not, so the chain of trust cannot reach it. Turn on DNSSEC for the parent zone where it is hosted, then add this DS record there:'
          )}
        </DnssecMissing>
        <DsTable dsRecords={dnssec.dsToPublish} copyable />
      </div>
    );
  if (dnssec.status === 'dsMismatch')
    return (
      <div className="flex flex-col gap-3">
        <h4 className="text-base font-medium">{t('DNSSEC')}</h4>
        <Alert type="critical">
          {t(
            'The DNSSEC anchor (DS record) published for your domain does not match your zone keys. Validating DNS resolvers will refuse to resolve your domain! Remove or replace the DS record at your registrar/DNS host.'
          )}
        </Alert>
        <p className={MUTED}>{t('Currently published:')}</p>
        <DsTable dsRecords={dnssec.parentDsRecords} />
        <p className={MUTED}>{t('Expected (from your zone keys):')}</p>
        <DsTable dsRecords={dnssec.dsToPublish} copyable />
        <DsHint provider={provider} />
      </div>
    );
  // dsMissing
  return (
    <div className="flex flex-col gap-3">
      <DnssecMissing>{t('Add this DS record at your registrar:')}</DnssecMissing>
      <DsTable dsRecords={dnssec.dsToPublish} copyable />
      <DsHint provider={provider} />
    </div>
  );
};

// Every unanchored state leads with the same reason to care, then says what is in the way
const DnssecMissing = ({ children }: { children: ReactNode }) => (
  <Alert type="warning">
    <p>{t('For your security and email deliverability, DNSSEC should be configured.')}</p>
    <p className="mt-1 text-sm">{children}</p>
  </Alert>
);

// Where this provider takes the DS record; the provider is picked in the records block
const DsHint = ({ provider }: { provider: DnsProvider }) => (
  <p className={MUTED}>
    {provider.name}: {t(provider.dsHint)}
  </p>
);

// The exact tuple registrar forms ask for, copyable per field
const DsTable = ({ dsRecords, copyable }: { dsRecords: DsRecord[]; copyable?: boolean }) => (
  <div className={`${TABLE_CARD} overflow-x-auto`}>
    <table className="w-full text-left text-sm">
      <thead className={TABLE_HEAD_BASE}>
        <tr>
          <th className="px-4 py-2 font-medium">{t('Key tag')}</th>
          <th className="px-4 py-2 font-medium">{t('Algorithm')}</th>
          <th className="px-4 py-2 font-medium">{t('Digest type')}</th>
          <th className="px-4 py-2 font-medium">{t('Digest')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 border-t border-gray-200 font-mono dark:divide-gray-700 dark:border-gray-700">
        {dsRecords.map((ds) => (
          <tr key={`${ds.keyTag}-${ds.digestType}-${ds.digest}`} className="group align-top">
            <CopyCell value={`${ds.keyTag}`} label={t('Key tag')} copyable={copyable} />
            <CopyCell value={`${ds.algorithm}`} label={t('Algorithm')} copyable={copyable} />
            <CopyCell value={`${ds.digestType}`} label={t('Digest type')} copyable={copyable} />
            <CopyCell
              value={ds.digest}
              label={t('Digest')}
              copyable={copyable}
              className="break-all"
            />
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CopyCell = ({
  value,
  label,
  copyable,
  className,
}: {
  value: string;
  label: string;
  copyable?: boolean;
  className?: string;
}) => (
  <td className={`px-4 py-2 ${className || ''}`}>
    {value}
    {copyable ? (
      <CopyIconButton
        value={value}
        label={label}
        className="ml-1 align-middle sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
      />
    ) : null}
  </td>
);

export default DnsSecuritySettings;
