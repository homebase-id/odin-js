import { t, ActionButton, Select } from '@homebase-id/common-app';
import { Download, ExternalLink } from '@homebase-id/common-app/icons';
import { DnsHealthRecord } from '../../../provider/dns/DnsHealthProvider';
import { DNS_PROVIDERS, DnsProvider } from './providers';
import { BTN, CopyIconButton, DnsRecordsTable, LINK, MUTED, TABLE_CARD } from './DnsRecordRow';
import { downloadZoneFile, isMissing, stripDot } from './zoneFile';

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
        </>
      )}
      <div>
        <button type="button" onClick={onUseRecords} className={`text-sm ${LINK}`}>
          {t('Add records instead')}
        </button>
      </div>
    </div>
  );
};

// The manual path: where the provider takes records, plus a zone file import where it has one.
export const RecordSetup = ({
  records,
  existingZone,
  origin,
  provider,
  onSelectProvider,
  onUseNameservers,
}: {
  records: DnsHealthRecord[]; // the records the owner needs (apex A, not ALIAS)
  existingZone?: boolean; // the zone is live, so an import has to add to it
  origin: string;
  provider: DnsProvider;
  onSelectProvider: (id: string) => void;
  onUseNameservers?: () => void;
}) => {
  // Only what is missing: imports that add to a zone (Route 53, GoDaddy) reject the whole
  // file when one record already exists
  const missing = records.filter(isMissing);
  if (!missing.length) return null;

  const zoneImport =
    provider.zoneImport && (provider.zoneImport.addsRecords || !existingZone)
      ? provider.zoneImport
      : undefined;
  const [first, ...rest] = provider.steps;
  const steps = zoneImport ? [first, zoneImport.step, ...rest] : provider.steps;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-medium">{t('Add these records at your DNS host')}</h4>
        {onUseNameservers ? (
          <button type="button" onClick={onUseNameservers} className={`text-sm ${LINK}`}>
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
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3 text-sm">
            <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
              {i + 1}
            </span>
            <span>{t(step)}</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-row flex-wrap items-center gap-2">
        {zoneImport ? (
          <ActionButton
            type="primary"
            size="none"
            className={BTN}
            icon={Download}
            onClick={() => downloadZoneFile(missing, origin)}
          >
            {t('Download zone file')}
          </ActionButton>
        ) : null}
        {provider.dnsUrl ? (
          <a
            href={provider.dnsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={`text-sm ${LINK} flex flex-row items-center gap-1 sm:ml-auto`}
          >
            <ExternalLink className="h-4 w-4" />
            {t('Open')} {provider.name} {t('DNS settings')}
          </a>
        ) : null}
      </div>
    </div>
  );
};
