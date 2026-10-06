import { t, ActionButton, Select } from '@homebase-id/common-app';
import { Clipboard, Download, ExternalLink } from '@homebase-id/common-app/icons';
import { DnsHealthRecord } from '../../../provider/dns/DnsHealthProvider';
import { DNS_PROVIDERS, DnsProvider } from './providers';
import { CopyIconButton, DnsRecordsTable, TABLE_CARD } from './DnsRecordRow';
import { stripDot, toTsv, toZoneFile } from './zoneFile';
import { useCopy } from './useCopy';

const MUTED = 'text-slate-500 dark:text-slate-400';
const LINK =
  'rounded text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const BTN = 'px-3 py-1.5 text-sm';

const ProviderSelect = ({
  label,
  provider,
  onSelectProvider,
}: {
  label: string;
  provider: DnsProvider;
  onSelectProvider: (id: string) => void;
}) => (
  <label className="flex items-center gap-2 text-sm">
    <span className={MUTED}>{label}</span>
    <Select
      aria-label={label}
      value={provider.id}
      onChange={(e) => onSelectProvider(e.target.value)}
      className="!w-auto min-w-[10rem] !py-0 !text-sm"
    >
      {DNS_PROVIDERS.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  </label>
);

// The recommended path: point the domain at Homebase and every record is managed for you.
export const NameserverSetup = ({
  nsRecords,
  origin,
  provider,
  onSelectProvider,
  onUseRecords,
}: {
  nsRecords: DnsHealthRecord[];
  origin: string;
  provider: DnsProvider;
  onSelectProvider: (id: string) => void;
  onUseRecords: () => void;
}) => {
  const { copied, copy } = useCopy();
  // NS at the zone itself = a registered domain, whose nameservers only the registrar can
  // change. Otherwise the NS records go into the parent zone.
  const isApex =
    nsRecords.length > 0 &&
    stripDot(nsRecords[0].domain).toLowerCase() === stripDot(origin).toLowerCase();
  const nameservers = nsRecords.map((r) => stripDot(r.value));

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <h4 className="text-base font-medium">{t('Use Homebase nameservers (recommended)')}</h4>
        <p className={MUTED}>{t('Homebase then manages every record for you.')}</p>
      </div>
      {isApex ? (
        <>
          <p>{t('At your registrar, set these custom nameservers:')}</p>
          <div className={`${TABLE_CARD} divide-y divide-gray-200 dark:divide-gray-700`}>
            {nameservers.map((ns) => (
              <div key={ns} className="flex items-center gap-1 px-4 py-2">
                <span className="break-all font-mono text-sm">{ns}</span>
                <CopyIconButton value={ns} label={t('Nameserver')} />
              </div>
            ))}
          </div>
          <ProviderSelect
            label={t('Where is your domain registered?')}
            provider={provider}
            onSelectProvider={onSelectProvider}
          />
          <p className={MUTED}>
            {provider.nameserverHint
              ? `${provider.name}: ${t(provider.nameserverHint)}`
              : t('Look for "Nameservers" or "Custom DNS" in your registrar\'s domain settings.')}
          </p>
          <p className={MUTED}>
            {t(
              'This replaces your current DNS. A website or email hosted elsewhere on this domain stops working until it is re-created.'
            )}
          </p>
        </>
      ) : (
        <>
          <p>
            {t('Add these NS records in the')} <span className="font-mono">{stripDot(origin)}</span>{' '}
            {t('zone:')}
          </p>
          <DnsRecordsTable records={nsRecords} origin={origin} />
          <div>
            <ActionButton
              type="secondary"
              size="none"
              className={BTN}
              icon={Clipboard}
              onClick={() => copy(toTsv(nsRecords, origin))}
            >
              {copied ? t('Copied') : t('Copy all')}
            </ActionButton>
          </div>
        </>
      )}
      <div>
        <button type="button" onClick={onUseRecords} className={LINK}>
          {t('Add records instead')}
        </button>
      </div>
    </div>
  );
};

// The manual path: where the provider takes records, plus a zone file import or copy-all.
export const RecordSetup = ({
  records,
  zoneRecords,
  origin,
  provider,
  onSelectProvider,
  onUseNameservers,
}: {
  records: DnsHealthRecord[]; // what is copied
  zoneRecords: DnsHealthRecord[]; // the zone file set (apex A, not ALIAS)
  origin: string;
  provider: DnsProvider;
  onSelectProvider: (id: string) => void;
  onUseNameservers?: () => void;
}) => {
  const { copied, copy } = useCopy();
  if (!records.length) return null;

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([toZoneFile(zoneRecords, origin)], { type: 'text/plain' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stripDot(origin)}.zone`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-medium">{t('Add these records at your DNS host')}</h4>
        {onUseNameservers ? (
          <button type="button" onClick={onUseNameservers} className={LINK}>
            {t('Use Homebase nameservers instead')}
          </button>
        ) : null}
      </div>
      <ProviderSelect
        label={t('Where is your DNS?')}
        provider={provider}
        onSelectProvider={onSelectProvider}
      />
      <ol className="flex flex-col gap-2.5">
        {provider.steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3 text-sm">
            <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
              {i + 1}
            </span>
            <span>{t(step)}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-row flex-wrap items-center gap-2">
        {provider.supportsZoneImport ? (
          <ActionButton
            type="primary"
            size="none"
            className={BTN}
            icon={Download}
            onClick={download}
          >
            {t('Download zone file')}
          </ActionButton>
        ) : null}
        <ActionButton
          type="secondary"
          size="none"
          className={BTN}
          icon={Clipboard}
          onClick={() => copy(toTsv(records, origin))}
        >
          {copied ? t('Copied') : t('Copy all')}
        </ActionButton>
        {provider.dnsUrl ? (
          <a
            href={provider.dnsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={`${LINK} flex flex-row items-center gap-1 sm:ml-auto`}
          >
            <ExternalLink className="h-4 w-4" />
            {t('Open')} {provider.name} {t('DNS settings')}
          </a>
        ) : null}
      </div>
    </div>
  );
};
