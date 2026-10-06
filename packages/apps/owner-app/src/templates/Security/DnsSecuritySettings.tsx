import { useState } from 'react';
import { t, ActionButton, Alert, LoadingBlock } from '@homebase-id/common-app';
import { Refresh } from '@homebase-id/common-app/icons';
import { NameserverSetup, RecordSetup } from './dns/DnsExport';
import { CopyIconButton, DnsRecordsTable, TABLE_CARD, TABLE_HEAD } from './dns/DnsRecordRow';
import { requiredRecords, zoneOrigin } from './dns/zoneFile';
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

const MUTED = 'text-sm text-slate-500 dark:text-slate-400';

// DNS health panel (Security tab): required-record status, the optional www record and
// the DNSSEC chain of trust. Read-only - fixing anything happens at the user's
// registrar/DNS host; this panel tells them exactly what and where.
export const DnsSecuritySettings = () => {
  const {
    fetchDnsHealth: { data: health, isLoading, isRefetching, error, refetch },
  } = useDnsHealth();

  const verify = () => refetch();
  // One choice for the whole panel: the setup steps and the DNSSEC hint follow it
  const { provider, select } = useDnsProvider();
  // Nameservers is the default when Homebase can host the zone; data arrives async, so the
  // owner's choice is only stored once made
  const [chosen, setChosen] = useState<Mode>();
  const records = health?.records ?? [];
  const hasNs = records.some((r) => r.type === 'NS');
  // Without NS records there is no nameserver path, whatever was chosen before a Refresh
  const mode: Mode = hasNs ? (chosen ?? 'nameservers') : 'records';
  const delegated = isDelegated(records);
  // Optional and DNSSEC stay out of the nameserver setup only; every other view shows them
  const showingNameservers =
    !delegated &&
    mode === 'nameservers' &&
    !!zoneOrigin(records, health?.dnssec.enclosingZone) &&
    requiredRecords(records).shown.some((r) => r.status !== 'success');

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
            onClick={verify}
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
              records={health.records}
              enclosingZone={health.dnssec.enclosingZone}
              mode={mode}
              onModeChange={setChosen}
              provider={provider}
              onSelectProvider={select}
            />
            <OptionalRecordsBlock
              optionalRecords={health.optionalRecords}
              show={!delegated && !showingNameservers}
            />
            <DnssecBlock dnssec={health.dnssec} provider={provider} hidden={showingNameservers} />
          </div>
        ) : null}
      </Section>
    </>
  );
};

const isDelegated = (records: DnsHealthRecord[]) => {
  const ns = records.filter((r) => r.type === 'NS');
  return ns.length > 0 && ns.every((r) => r.status === 'success');
};

const RecordsBlock = ({
  records,
  enclosingZone,
  mode,
  onModeChange,
  provider,
  onSelectProvider,
}: {
  records: DnsHealthRecord[];
  enclosingZone?: string;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  provider: DnsProvider;
  onSelectProvider: (id: string) => void;
}) => {
  const { shown: visibleRecords, zone: zoneRecords } = requiredRecords(records);
  const nsRecords = records.filter((r) => r.type === 'NS');
  const origin = zoneOrigin(records, enclosingZone);
  const allGood = visibleRecords.every((r) => r.status === 'success');

  // Exactly one branch, so the setup block is always first and the page does not jump
  if (isDelegated(records)) {
    return (
      <Alert type="success">{t('Your domain uses Homebase nameservers. Nothing to do.')}</Alert>
    );
  }
  if (allGood) {
    return (
      <div className="flex flex-col gap-3">
        <Alert type="success">{t('Your DNS records are set up correctly.')}</Alert>
        <details>
          <summary className={`cursor-pointer ${MUTED}`}>{t('Show records')}</summary>
          <div className="mt-3">
            <DnsRecordsTable records={visibleRecords} origin={origin} />
          </div>
        </details>
      </div>
    );
  }
  if (mode === 'nameservers' && origin) {
    return (
      <NameserverSetup
        nsRecords={nsRecords}
        origin={origin}
        provider={provider}
        onSelectProvider={onSelectProvider}
        onUseRecords={() => onModeChange('records')}
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {origin ? (
        <RecordSetup
          records={visibleRecords}
          zoneRecords={zoneRecords}
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
  hidden,
}: {
  dnssec: DnssecHealth;
  provider: DnsProvider;
  hidden: boolean;
}) => {
  // A mismatch breaks resolution, so it shows even when nameservers are the chosen path
  if (hidden && dnssec.status !== 'dsMismatch') return null;

  if (dnssec.status === 'secure')
    return <p className={MUTED}>{t('DNSSEC: fully active, with an unbroken chain of trust.')}</p>;
  if (dnssec.status === 'inherited')
    return (
      <p className={MUTED}>
        {/* Not necessarily Homebase's zone: id.example.com can sit in the owner's own
            example.com zone, wherever that is hosted */}
        {t('DNSSEC: set for the')} <span className="font-mono">{dnssec.enclosingZone}</span>{' '}
        {t('zone your domain is part of, nothing to do.')}
      </p>
    );
  if (dnssec.status === 'zoneUnsigned')
    return (
      <p className={MUTED}>
        {t('DNSSEC: not available, your DNS host does not sign your zone. That is fine.')}
      </p>
    );
  if (dnssec.status === 'parentUnsigned')
    return (
      <p className={MUTED}>
        {t("DNSSEC: not available, your domain's parent zone is not signed. That is fine.")}
      </p>
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
      <Alert type="warning">
        {t('Recommended: add this DS record at your registrar (DNSSEC).')}
      </Alert>
      <DsTable dsRecords={dnssec.dsToPublish} copyable />
      <DsHint provider={provider} />
    </div>
  );
};

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
      <thead className={TABLE_HEAD.replace('hidden', '').replace('sm:grid', '')}>
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
