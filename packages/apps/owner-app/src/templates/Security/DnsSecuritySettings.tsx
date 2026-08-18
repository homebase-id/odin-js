import { useState } from 'react';
import { t, ActionButton, Alert, LoadingBlock } from '@homebase-id/common-app';
import { Check, Exclamation, Refresh } from '@homebase-id/common-app/icons';
import Section from '../../components/ui/Sections/Section';
import { useDnsHealth } from '../../hooks/dns/useDnsHealth';
import {
  DnsHealthRecord,
  DnssecHealth,
  DsRecord,
  OptionalDnsRecord,
} from '../../provider/dns/DnsHealthProvider';

// DNS health panel (Security tab): required-record status, the optional www record and
// the DNSSEC chain of trust. Read-only - fixing anything happens at the user's
// registrar/DNS host; this panel tells them exactly what and where.
export const DnsSecuritySettings = () => {
  const {
    fetchDnsHealth: { data: health, isLoading, isRefetching, error, refetch },
  } = useDnsHealth();

  const verify = () => refetch();

  return (
    <>
      {error ? (
        <Alert type="critical" className="mb-4">
          {t('Could not check your DNS right now. Please try again later.')}
        </Alert>
      ) : null}

      <Section
        title={
          <div className="flex w-full flex-row items-center justify-between gap-6">
            <div className="flex flex-col">
              {t('DNS')}
              <small className="text-sm text-gray-400">
                {t('The DNS records and DNSSEC state of your domain')}
              </small>
            </div>
            {/* "Refresh", not "Verify": the check already runs when the tab opens */}
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
          </div>
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
            <RecordsBlock records={health.records} />
            <OptionalRecordsBlock optionalRecords={health.optionalRecords} />
            <DnssecBlock dnssec={health.dnssec} />
          </div>
        ) : null}
      </Section>
    </>
  );
};

const RecordsBlock = ({ records }: { records: DnsHealthRecord[] }) => {
  // ALIAS is an either-or alternative to the apex A record; showing both as required
  // rows would always leave one "failing". Show ALIAS only when it is the one in use.
  const apexARecord = records.find((r) => r.type === 'A');
  const aliasRecord = records.find((r) => r.type === 'ALIAS');
  const apexRecord =
    apexARecord?.status !== 'success' && aliasRecord?.status === 'success'
      ? aliasRecord
      : apexARecord;

  const visibleRecords = [
    ...(apexRecord ? [apexRecord] : []),
    ...records.filter((r) => r.type === 'CNAME'),
  ];
  const nsRecords = records.filter((r) => r.type === 'NS');
  const isDelegated = nsRecords.length > 0 && nsRecords.every((r) => r.status === 'success');

  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg">{t('Records')}</p>
      {isDelegated ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('DNS for your domain is delegated to Homebase - these records are served from your Homebase-hosted zone.')}
        </p>
      ) : null}
      {visibleRecords.map((record) => (
        <RecordRow key={`${record.type}-${record.domain}`} record={record} />
      ))}
    </div>
  );
};

const RecordRow = ({ record }: { record: DnsHealthRecord }) => {
  const isGood = record.status === 'success';
  return (
    <div
      className={`flex flex-row flex-wrap items-center gap-2 rounded-lg px-4 py-3 font-mono text-sm ${
        isGood ? 'bg-green-100 dark:bg-green-900' : 'bg-orange-100 dark:bg-orange-900'
      }`}
    >
      <span>{record.domain}.</span>
      <span>{record.type === 'ALIAS' ? 'CNAME' : record.type}</span>
      <span>{record.value}</span>
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

const OptionalRecordsBlock = ({ optionalRecords }: { optionalRecords: OptionalDnsRecord[] }) => {
  if (!optionalRecords.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg">{t('Optional')}</p>
      {optionalRecords.map((record) => (
        <div
          key={record.domain}
          className="flex flex-row flex-wrap items-center gap-2 rounded-lg bg-gray-100 px-4 py-3 font-mono text-sm dark:bg-gray-800"
        >
          <span>{record.domain}.</span>
          <span className="ml-auto text-slate-500 dark:text-slate-400">
            {record.status === 'success'
              ? t('Points at your identity')
              : record.status === 'notSet'
                ? t("Not set - that's fine")
                : t('Not pointing at your identity - fine if intentional')}
          </span>
          {record.status === 'success' ? <Check className="h-5 w-5" /> : null}
        </div>
      ))}
    </div>
  );
};

const DnssecBlock = ({ dnssec }: { dnssec: DnssecHealth }) => {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg">{t('DNSSEC')}</p>
      {dnssec.status === 'secure' ? (
        <Alert type="success">
          {t('DNSSEC is fully active: your domain has an unbroken, validated chain of trust.')}
        </Alert>
      ) : dnssec.status === 'inherited' ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('DNSSEC for your domain is handled by Homebase as part of the')}{' '}
          <span className="font-mono">{dnssec.enclosingZone}</span> {t('zone - nothing to do here.')}
        </p>
      ) : dnssec.status === 'zoneUnsigned' ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('Your DNS host does not sign your zone, so DNSSEC is not available. Your identity works normally without it.')}
        </p>
      ) : dnssec.status === 'parentUnsigned' ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("Your zone is signed, but your domain's parent zone is not - a chain of trust cannot reach your domain. Nothing to configure here; your identity works normally.")}
        </p>
      ) : dnssec.status === 'dsMismatch' ? (
        <>
          <Alert type="critical">
            {t('The DNSSEC anchor (DS record) published for your domain does not match your zone keys. Validating DNS resolvers will refuse to resolve your domain! Remove or replace the DS record at your registrar/DNS host.')}
          </Alert>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('Currently published:')}</p>
          <DsTable dsRecords={dnssec.parentDsRecords} />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('Expected (from your zone keys):')}</p>
          <DsTable dsRecords={dnssec.dsToPublish} copyable />
        </>
      ) : (
        // dsMissing
        <>
          <Alert type="warning">
            {t('Your DNS zone is cryptographically signed, but the chain of trust is not anchored yet. Optional: add this DS record where your domain is delegated - at your registrar for a registered (apex) domain, or as a DS record next to your NS records at your DNS host for a subdomain.')}
          </Alert>
          <DsTable dsRecords={dnssec.dsToPublish} copyable />
        </>
      )}
    </div>
  );
};

// The exact tuple registrar forms ask for, copyable per field
const DsTable = ({ dsRecords, copyable }: { dsRecords: DsRecord[]; copyable?: boolean }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left font-mono text-sm">
      <thead>
        <tr className="text-slate-500 dark:text-slate-400">
          <th className="py-1 pr-4 font-normal">{t('Key tag')}</th>
          <th className="py-1 pr-4 font-normal">{t('Algorithm')}</th>
          <th className="py-1 pr-4 font-normal">{t('Digest type')}</th>
          <th className="py-1 font-normal">{t('Digest')}</th>
        </tr>
      </thead>
      <tbody>
        {dsRecords.map((ds) => (
          <tr key={`${ds.keyTag}-${ds.digestType}-${ds.digest}`}>
            <CopyCell value={`${ds.keyTag}`} copyable={copyable} />
            <CopyCell value={`${ds.algorithm}`} copyable={copyable} />
            <CopyCell value={`${ds.digestType}`} copyable={copyable} />
            <CopyCell value={ds.digest} copyable={copyable} className="break-all" />
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CopyCell = ({
  value,
  copyable,
  className,
}: {
  value: string;
  copyable?: boolean;
  className?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <td
      className={`py-1 pr-4 ${copyable ? 'cursor-pointer hover:underline' : ''} ${className || ''}`}
      onClick={copyable ? copy : undefined}
      title={copyable ? t('Click to copy') : undefined}
    >
      {value}
      {copied ? <span className="ml-2 text-xs text-green-600">{t('Copied')}</span> : null}
    </td>
  );
};

export default DnsSecuritySettings;
