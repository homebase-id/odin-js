import { ReactNode, useState } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import InfoDialog from '../Dialog/InfoDialog/InfoDialog';
import { DnsConfig, DnsRecord, DnsRecordStatus } from '../../hooks/commonDomain/commonDomain';
import { Alert, DialogWrapper } from '@homebase-id/common-app';
import {
  Arrow,
  Check,
  ChevronDown,
  ChevronUp,
  Exclamation,
  ExternalLink,
} from '@homebase-id/common-app/icons';
import { getRegistrableDomain, isRegistrableApex } from '../../helpers/registrableDomain';

const DnsSettingsView = ({
  domain,
  dnsConfig,
  showStatus,
}: {
  domain: string;
  dnsConfig: DnsConfig;
  showStatus: boolean;
}) => {
  // Apex-ness is decided from the domain name (public-suffix based), NOT from a zone
  // lookup: a subdomain delegated to Homebase has its own SOA and would look like an
  // apex to any DNS-based check
  const isApexDomain = isRegistrableApex(domain);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  const subRecords = dnsConfig.filter((record) => !!record.name && record.type !== 'NS');
  const nsRecords = dnsConfig.filter((record) => record.type === 'NS');

  const [openSection, setOpenSection] = useState<'delegate' | 'manual'>('delegate');

  const manualSetupBlock = (
    <>
      {isApexDomain ? (
        <ApexInfoBlock
          dnsConfig={dnsConfig}
          domain={domain}
          showStatus={showStatus}
          yourDomain={domain}
          className="mb-10"
        />
      ) : (
        <SubdomainInfoBlock
          dnsConfig={dnsConfig}
          domain={domain}
          showStatus={showStatus}
          yourDomain={domain}
          className="mb-10"
        />
      )}
      <div className="flex flex-col gap-2">
        <p className="mb-5 text-2xl">{t('Add the required subdomains')}</p>
        {subRecords.length > 0 ? (
          <>
            {subRecords.map((record) => (
              <RecordView key={record.name} record={record} domain={domain} showStatus={showStatus} />
            ))}
          </>
        ) : null}
      </div>
    </>
  );

  return (
    <>
      <section className="">
        <p className="mb-4">
          <button onClick={() => setInfoDialogOpen(true)} className="block underline">
            {t('How do I do this?')}
          </button>
        </p>

        {nsRecords.length > 0 ? (
          // Two mutually exclusive setups; only one is unfolded at a time
          <div className="flex flex-col gap-4">
            <AccordionSection
              title={t('Let Homebase manage DNS')}
              badge={t('Recommended')}
              isOpen={openSection === 'delegate'}
              onOpen={() => setOpenSection('delegate')}
            >
              <NsDelegationBlock
                nsRecords={nsRecords}
                domain={domain}
                isApexDomain={isApexDomain}
                showStatus={showStatus}
                className=""
              />
            </AccordionSection>
            <AccordionSection
              title={t('Set up the records yourself')}
              isOpen={openSection === 'manual'}
              onOpen={() => setOpenSection('manual')}
            >
              {manualSetupBlock}
            </AccordionSection>
          </div>
        ) : (
          manualSetupBlock
        )}
      </section>
      <InfoDialog
        title={t('How do I do this?')}
        isOpen={infoDialogOpen}
        onConfirm={() => setInfoDialogOpen(false)}
        onCancel={() => setInfoDialogOpen(false)}
      >
        <>
          <p className="mb-4">
            {t(
              "Depending on your provider you'll need to setup the records in a different way. Consult the documentation for your DNS registar"
            )}
          </p>
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Cloudflare</h2>
            <a
              className="my-1 flex flex-row items-center rounded-lg border p-2"
              target="_blank"
              rel="noreferrer noopener"
              href="https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/"
            >
              Cloudflare {t('Documentation')}
              <Arrow className="ml-auto h-5 w-5" />
            </a>
          </div>
          <div className="mb-5">
            <h2 className="text-lg font-semibold">One.com</h2>
            <a
              className="my-1 flex flex-row items-center rounded-lg border p-2"
              target="_blank"
              rel="noreferrer noopener"
              href="https://help.one.com/hc/en-us/articles/360000803517-How-do-I-create-a-CNAME-record-"
            >
              One.com {t('Documentation')}
              <Arrow className="ml-auto h-5 w-5" />
            </a>
          </div>
        </>
      </InfoDialog>
    </>
  );
};

const AccordionSection = ({
  title,
  badge,
  isOpen,
  onOpen,
  children,
}: {
  title: string;
  badge?: string;
  isOpen: boolean;
  onOpen: () => void;
  children: ReactNode;
}) => {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full flex-row items-center gap-3 px-5 py-4 text-left text-xl ${
          isOpen ? '' : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {title}
        {badge ? (
          <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-sm text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
            {badge}
          </span>
        ) : null}
        {isOpen ? (
          <ChevronUp className="ml-auto h-5 w-5 flex-shrink-0" />
        ) : (
          <ChevronDown className="ml-auto h-5 w-5 flex-shrink-0" />
        )}
      </button>
      {isOpen ? <div className="px-5 pb-5">{children}</div> : null}
    </div>
  );
};

const NsDelegationBlock = ({
  nsRecords,
  domain,
  isApexDomain,
  showStatus,
  className,
}: {
  nsRecords: DnsRecord[];
  domain: string;
  isApexDomain: boolean;
  showStatus: boolean;
  className: string;
}) => {
  const isDelegated =
    nsRecords.length > 0 && nsRecords.every((record) => record.status === 'success');
  const registrableDomain = getRegistrableDomain(domain) || domain;
  const subLabel = isApexDomain ? '' : domain.replace(`.${registrableDomain}`, '');

  return (
    <div className={`${className} flex flex-col gap-4`}>
      {isApexDomain ? (
        <>
          <p>
            {t(
              `Change your domain's nameservers at your registrar to the servers below. Homebase then manages all DNS records for you - including any future ones (e.g. email) - so you never have to touch DNS again.`
            )}
          </p>
          <Alert type="warning">
            {t(
              `If you use ${domain} for anything except Homebase (a website, email, ...), don't do this - set up the records yourself instead.`
            )}
          </Alert>
        </>
      ) : (
        <p>
          {t(
            `Add these NS records for "${subLabel}" in the ${registrableDomain} zone at your DNS host. Homebase then manages all DNS records for ${domain} - including any future ones (e.g. email) - so you never have to touch DNS again.`
          )}
        </p>
      )}
      {nsRecords.map((record) => (
        <RecordView key={record.value} record={record} domain={domain} showStatus={showStatus} />
      ))}
      {showStatus && isDelegated ? (
        <Alert type="success">
          {t('DNS delegation detected - no other records are needed.')}
        </Alert>
      ) : null}
    </div>
  );
};

const ApexInfoBlock = ({
  dnsConfig,
  domain,
  showStatus,
  yourDomain,
  className,
}: {
  dnsConfig: DnsRecord[];
  domain: string;
  showStatus: boolean;
  yourDomain: string;
  className: string;
}) => {
  const aliasARecord = dnsConfig.find((record) => record.type === 'ALIAS');
  const fallbackARecord = dnsConfig.find((record) => record.type === 'A');

  // if one of them is good, they are both:
  const uniformStatus =
    aliasARecord?.status === 'success' || fallbackARecord?.status === 'success'
      ? 'success'
      : undefined;

  return (
    <div className={`${className} flex flex-col gap-4`}>
      <p className="text-2xl">
        Point your domain <span className="rounded-md bg-slate-100 px-2 dark:bg-slate-700">{yourDomain}</span> to
        Homebase
      </p>
      {aliasARecord ? (
        <>
          <p>
            <span className="font-medium">{t('Recommended')}:</span>
            <br />
            {t('Point ALIAS, ANAME, or flattened CNAME record to')} {aliasARecord.value}
          </p>
          <p className="text-sm text-slate-400">
            If your DNS provider supports ALIAS, ANAME, or flattened CNAME records, use this
            recommended configuration, which is more resilient than the fallback option.
          </p>
          <RecordView
            record={aliasARecord}
            status={uniformStatus}
            domain={domain}
            showStatus={showStatus}
          />
        </>
      ) : null}
      {fallbackARecord ? (
        <>
          <p className="mt-4">
            <span className="font-medium">{t('Fallback')}:</span>
            <br />
            {t('Point A record to')} {fallbackARecord?.value}
          </p>
          <p className="text-sm text-slate-400">
            {t(
              'If your DNS provider does not support ALIAS, ANAME, or flattened CNAME records, use this fallback option.'
            )}
          </p>
          <RecordView
            record={fallbackARecord}
            status={uniformStatus}
            domain={domain}
            showStatus={showStatus}
            hideDotOnValue={true}
          />
        </>
      ) : null}
    </div>
  );
};

const SubdomainInfoBlock = ({
  dnsConfig,
  domain,
  yourDomain,
  showStatus,
  className,
}: {
  dnsConfig: DnsRecord[];
  domain: string;
  yourDomain: string;
  showStatus: boolean;
  className: string;
}) => {
  const aliasARecord = dnsConfig.find((record) => record.type === 'ALIAS');
  const fallbackARecord = dnsConfig.find((record) => record.type === 'A');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fallbackOnlyCorrect =
    fallbackARecord?.status === 'success' && aliasARecord?.status !== 'success';

  return (
    <div className={`${className} flex flex-col gap-4`}>
      <p className="text-2xl">
        Point your domain <span className="rounded-md bg-slate-100 px-2 dark:bg-slate-700">{yourDomain}</span> to
        Homebase
      </p>
      {aliasARecord ? (
        <>
          <RecordView
            record={{ ...aliasARecord, type: 'CNAME' }}
            status={fallbackOnlyCorrect ? 'success' : undefined}
            domain={domain}
            showStatus={showStatus}
          />
          {fallbackOnlyCorrect ? (
            <Alert type="info">
              {t(
                `We found a direct A record pointing to your identity, while this is correct we only recommend this in case your DNS provider doesn't support an ALIAS, ANAME, or flattened CNAME record.`
              )}
            </Alert>
          ) : null}
        </>
      ) : null}
      <button onClick={() => setShowAdvanced(true)} className="ml-auto underline">
        {t(`I can't do this`)}
      </button>

      {showAdvanced ? (
        <DialogWrapper
          title={t('Advanced domain setup')}
          onClose={() => setShowAdvanced(false)}
          isSidePanel={false}
          size="2xlarge"
        >
          <ApexInfoBlock
            dnsConfig={dnsConfig}
            domain={domain}
            yourDomain={yourDomain}
            showStatus={false}
            className=""
          />
        </DialogWrapper>
      ) : null}
    </div>
  );
};

const errorStates = ['incorrectValue', 'aaaaRecordsNotSupported', 'multipleRecordsNotSupported'];
const RecordView = ({
  record,
  status,
  domain,
  showStatus,
  hideDotOnValue,
}: {
  record: DnsRecord;
  status?: DnsRecordStatus;
  domain: string;
  showStatus: boolean;
  hideDotOnValue?: boolean;
}) => {
  const [showBadValue, setShowBadValue] = useState(false);

  const simpleStatus = status || record.status;
  const isGood = simpleStatus === 'success';

  const isInCorrectvalue = simpleStatus === 'incorrectValue';

  const recordValue = `${[record.name, domain].filter(Boolean).join('.')}`;
  const recordIsApex = !record.name;

  // Name-based split (see registrableDomain.ts for why a DNS lookup can't be used here)
  const registrableDomain = getRegistrableDomain(domain) || domain;
  const subDomain =
    registrableDomain !== domain ? domain.replace(`.${registrableDomain}`, '') : '';

  return (
    <>
      {' '}
      <div
        className={`flex flex-row flex-wrap items-center gap-2 rounded-lg ${
          showStatus
            ? isGood
              ? 'bg-green-100 dark:bg-green-900'
              : errorStates.includes(simpleStatus)
                ? 'bg-orange-100 dark:bg-orange-900'
                : 'bg-gray-100 dark:bg-gray-800'
            : 'bg-gray-100 dark:bg-gray-800'
        } px-4 py-3 font-mono text-base shadow-sm`}
      >
        <ClickToCopy value={recordValue}>
          {recordIsApex ? (
            <>{domain}.</>
          ) : (
            <>
              {[record.name, subDomain].filter(Boolean).join('.')}
              <span className={record.name ? `text-slate-400` : ''}>.{registrableDomain}.</span>
            </>
          )}
        </ClickToCopy>
        <p>{record.type}</p>
        <ClickToCopy>{`${record.value}${hideDotOnValue ? '' : '.'}`}</ClickToCopy>
        {showStatus ? (
          <div
            className={`ml-auto flex flex-row items-center gap-2 text-sm ${
              isInCorrectvalue
                ? 'cursor-pointer text-indigo-500 hover:underline'
                : `${!isGood ? 'text-orange-600 dark:text-orange-400' : ''}`
            }`}
            onClick={isInCorrectvalue ? () => setShowBadValue(true) : undefined}
          >
            {isGood ? (
              <Check className="h-5 w-5" />
            ) : (
              <>
                {isInCorrectvalue
                  ? 'Incorrect value'
                  : simpleStatus === 'aaaaRecordsNotSupported'
                    ? 'AAAA records are not supported'
                    : simpleStatus === 'multipleRecordsNotSupported'
                      ? 'Multiple A or CNAME records are not supported'
                      : 'Record not found'}

                {isInCorrectvalue ? (
                  <ExternalLink className="h-5 w-5" />
                ) : (
                  <Exclamation className="h-5 w-5" />
                )}
              </>
            )}
          </div>
        ) : null}
      </div>
      {record.records && showBadValue ? (
        <DialogWrapper
          title={t('Incorrect value')}
          onClose={() => setShowBadValue(false)}
          isSidePanel={false}
          size="2xlarge"
        >
          <p className="mb-4">
            Expected value:
            <span className="mt-1 block bg-gray-100 px-4 py-3 font-mono dark:bg-gray-800 text-base">
              {record.value}
              {hideDotOnValue ? '' : '.'}
            </span>
          </p>
          <p>
            But we have found this:{' '}
            <span className="mt-1 block bg-orange-100 px-4 py-3 font-mono dark:bg-orange-900 text-base">
              {Object.values(record.records)[0]}
            </span>
          </p>
        </DialogWrapper>
      ) : null}
    </>
  );
};

const ClickToCopy = (props: { children: string } | { children: ReactNode; value: string }) => {
  const { children } = props;
  const value = 'value' in props ? props.value : undefined;
  const [copied, setCopied] = useState(false);

  return (
    <div
      onClick={() => {
        navigator.clipboard.writeText(value || (typeof children === 'string' ? children : ''));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="relative cursor-pointer"
    >
      <p>{children}</p>
      {copied && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg bg-slate-800/80 px-2 py-1 text-sm text-white dark:bg-slate-600/80">
            {t('Copied')}
          </span>
        </div>
      )}
    </div>
  );
};

export default DnsSettingsView;
