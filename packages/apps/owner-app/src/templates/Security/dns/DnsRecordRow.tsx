import { useState } from 'react';
import { t } from '@homebase-id/common-app';
import { Check, Clipboard, Exclamation } from '@homebase-id/common-app/icons';
import { DnsHealthRecord } from '../../../provider/dns/DnsHealthProvider';
import { useCopy } from './useCopy';
import { displayType, normalizeValue, relativeHost, stripDot } from './zoneFile';

// Shared by every DNS table (records, DS records) so they read as one family
export const TABLE_CARD = 'overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700';
export const TABLE_HEAD_BASE =
  'bg-gray-50 px-4 py-2 text-xs font-medium text-slate-500 dark:bg-gray-900 dark:text-slate-400';
export const TABLE_HEAD = `hidden ${TABLE_HEAD_BASE} sm:grid`;
export const MUTED = 'text-slate-500 dark:text-slate-400';
// Text size is left to the caller
export const LINK =
  'rounded text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
export const BTN = 'px-3 py-1.5 text-sm';

// Named apart from common-app's CopyButton, which is a labelled text button
export const CopyIconButton = ({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) => {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      title={t('Copy')}
      aria-label={label ? `${t('Copy')} ${label}` : t('Copy')}
      className={`shrink-0 rounded p-1 text-slate-500 hover:bg-black/10 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-400 dark:hover:bg-white/10 ${className ?? ''}`}
    >
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Clipboard className="h-4 w-4" />}
    </button>
  );
};

// Always visible on touch screens; from sm up it fades in with row hover or keyboard focus
const REVEAL = 'sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100';

const StatusPill = ({ status }: { status: DnsHealthRecord['status'] }) =>
  status === 'success' ? (
    <span title={t('OK')} aria-label={t('OK')} className="inline-flex">
      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
      <Exclamation className="h-3.5 w-3.5" />
      {status === 'incorrectValue' ? t('Incorrect value') : t('Not found')}
    </span>
  );

const TypeBadge = ({ children }: { children: string }) => (
  <span className="inline-block rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold dark:bg-gray-800">
    {children}
  </span>
);

const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <span className={`mb-0.5 block text-xs sm:hidden ${MUTED}`}>{label}</span>
    {children}
  </div>
);

// Long values (DKIM keys) show two lines until expanded; Copy always takes the full value
const LONG_VALUE = 90;

// One record as the provider's form asks for it: Type / Host / Value, each copyable where
// it is typed into a form, plus whether it is currently right.
const DnsRecordRow = ({
  record,
  origin,
  showDescription,
}: {
  record: DnsHealthRecord;
  origin: string;
  showDescription?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const { value, priority } = normalizeValue(record);
  const host = relativeHost(record.domain, origin);
  const isLong = value.length > LONG_VALUE;

  return (
    <div className="group px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/60">
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,2fr)_7.5rem]">
        <div className="sm:pt-0.5">
          <TypeBadge>{displayType(record)}</TypeBadge>
          {priority ? (
            <span className={`ml-2 text-xs sm:ml-0 sm:mt-1 sm:block ${MUTED}`}>
              {t('Priority')} {priority}
            </span>
          ) : null}
        </div>
        <div className="row-start-1 justify-self-end sm:col-start-4 sm:justify-self-start sm:pt-0.5">
          <StatusPill status={record.status} />
        </div>
        <div className="col-span-2 sm:col-span-1 sm:col-start-2">
          <Cell label={t('Host')}>
            <div className="flex items-start gap-1">
              <span className="break-all font-mono text-sm" title={stripDot(record.domain)}>
                {host}
              </span>
              <CopyIconButton value={host} label={t('Host')} className={REVEAL} />
            </div>
          </Cell>
        </div>
        <div className="col-span-2 sm:col-span-1 sm:col-start-3">
          <Cell label={t('Value')}>
            <div className="flex items-start gap-1">
              <span
                className={`break-all font-mono text-sm ${isLong && !expanded ? 'line-clamp-2' : ''}`}
              >
                {value}
              </span>
              <CopyIconButton value={value} label={t('Value')} className={REVEAL} />
            </div>
            {isLong ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className={`mt-0.5 text-xs ${LINK}`}
              >
                {expanded ? t('Show less') : t('Show full value')}
              </button>
            ) : null}
          </Cell>
        </div>
      </div>
      {showDescription ? <p className={`mt-2 text-sm ${MUTED}`}>{record.description}</p> : null}
    </div>
  );
};

export const DnsRecordsTable = ({
  records,
  origin,
  showDescription,
}: {
  records: DnsHealthRecord[];
  origin: string;
  showDescription?: boolean;
}) => (
  <div className={TABLE_CARD}>
    <div className={`${TABLE_HEAD} grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,2fr)_7.5rem] gap-x-4`}>
      <span>{t('Type')}</span>
      <span>{t('Host')}</span>
      <span>{t('Value')}</span>
      <span>{t('Status')}</span>
    </div>
    <div className="divide-y divide-gray-200 dark:divide-gray-700 sm:border-t sm:border-gray-200 sm:dark:border-gray-700">
      {records.map((record) => (
        <DnsRecordRow
          key={`${record.type}-${record.domain}-${record.value}`}
          record={record}
          origin={origin}
          showDescription={showDescription}
        />
      ))}
    </div>
  </div>
);
