import { useState } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import InfoDialog from '../Dialog/InfoDialog/InfoDialog';
import { DnsConfig, DnsRecord, DnsRecordStatus } from '../../hooks/commonDomain/commonDomain';
import {
  Alert,
  Arrow,
  Check,
  DialogWrapper,
  Exclamation,
  ExternalLink,
  Loader,
} from '@youfoundation/common-app';
import { useApexDomain } from '../../hooks/ownDomain/useOwnDomain';

const DnsSettingsView = ({
  domain,
  dnsConfig,
  showStatus,
}: {
  domain: string;
  dnsConfig: DnsConfig;
  showStatus: boolean;
}) => {
  const { data: apexDomain, isFetched: gotApexInfo } = useApexDomain(domain);
  let subdomain = apexDomain ? domain.replace(apexDomain, '') : undefined;
  subdomain = subdomain?.slice(0, -1);

  const isApexDomain = apexDomain === domain;
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  const subRecords = dnsConfig.filter((record) => !!record.name);

  if (!gotApexInfo)
    return (
      <div className="flex flex-row items-center justify-center">
        <Loader className="h-10 w-10" />
      </div>
    );

  return (
    <>
      <section className="">
        <p className="mb-4">
          <button onClick={() => setInfoDialogOpen(true)} className="block underline">
            {t('How do I do this?')}
          </button>
        </p>

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
            subdomain={subdomain}
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
                <RecordView
                  key={record.name}
                  subdomain={subdomain}
                  record={record}
                  showStatus={showStatus}
                  appendDotOnValue={true}
                />
              ))}
            </>
          ) : null}
        </div>
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
        Point your domain <span className="rounded-md bg-slate-100 px-2">{yourDomain}</span> to
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
            appendDotOnValue={true}
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
          />
        </>
      ) : null}
    </div>
  );
};

const SubdomainInfoBlock = ({
  dnsConfig,
  domain,
  subdomain,
  yourDomain,
  showStatus,
  className,
}: {
  dnsConfig: DnsRecord[];
  domain: string;
  subdomain?: string;
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
        Point your domain <span className="rounded-md bg-slate-100 px-2">{yourDomain}</span> to
        Homebase
      </p>
      {aliasARecord ? (
        <>
          <RecordView
            record={{ ...aliasARecord, type: 'CNAME' }}
            status={fallbackOnlyCorrect ? 'success' : undefined}
            subdomain={subdomain}
            showStatus={showStatus}
            appendDotOnValue={true}
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
  subdomain,
  showStatus,
  appendDotOnValue,
}: {
  record: DnsRecord;
  status?: DnsRecordStatus;
  domain?: string;
  subdomain?: string;
  showStatus: boolean;
  appendDotOnValue?: boolean;
}) => {
  const [showBadValue, setShowBadValue] = useState(false);

  const simpleStatus = status || record.status;
  const isGood = simpleStatus === 'success';

  const isInCorrectvalue = simpleStatus === 'incorrectValue';

  return (
    <>
      {' '}
      <div
        className={`flex flex-row flex-wrap items-center gap-2 rounded-lg ${
          showStatus
            ? isGood
              ? 'bg-green-100'
              : errorStates.includes(simpleStatus)
                ? 'bg-orange-100'
                : 'bg-gray-100'
            : 'bg-gray-100'
        } px-4 py-3 font-mono text-base shadow-sm`}
      >
        <ClickToCopy>
          {[record.name || (domain ? `${domain}.` : undefined), subdomain]
            .filter(Boolean)
            .join('.')}
        </ClickToCopy>
        <p>{record.type}</p>
        <ClickToCopy>{`${record.value}${appendDotOnValue ? '.' : ''}`}</ClickToCopy>
        {showStatus ? (
          <div
            className={`ml-auto flex flex-row items-center gap-2 text-sm ${
              isInCorrectvalue ? 'cursor-pointer text-indigo-500 hover:underline' : ''
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
            <span className="mt-1 block bg-gray-100 px-4 py-3 font-mono text-base">
              {record.value}
              {appendDotOnValue ? '.' : ''}
            </span>
          </p>
          <p>
            But we have found this:{' '}
            <span className="mt-1 block bg-orange-100 px-4 py-3 font-mono text-base">
              {Object.values(record.records)[0]}
            </span>
          </p>
        </DialogWrapper>
      ) : null}
    </>
  );
};

const ClickToCopy = ({ children }: { children: string }) => {
  const [copied, setCopied] = useState(false);

  return (
    <div
      onClick={() => {
        navigator.clipboard.writeText(children);
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
