import { useState } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import InfoDialog from '../Dialog/InfoDialog/InfoDialog';
import { DnsConfig, DnsRecord } from '../../hooks/commonDomain/commonDomain';
import { Arrow, Check, Exclamation, Loader } from '@youfoundation/common-app';
import { useApexDomain } from '../../hooks/ownDomain/useOwnDomain';
import DialogWrapper from '../ui/Dialog/DialogWrapper';

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
            className="mb-10"
          />
        ) : (
          <SubdomainInfoBlock
            dnsConfig={dnsConfig}
            domain={domain}
            showStatus={showStatus}
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
              <Arrow className="ml-auto h-4 w-4" />
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
              <Arrow className="ml-auto h-4 w-4" />
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
  className,
}: {
  dnsConfig: DnsRecord[];
  domain: string;
  showStatus: boolean;
  className: string;
}) => {
  const aliasARecord = dnsConfig.find((record) => record.type === 'ALIAS');
  const fallbackARecord = dnsConfig.find((record) => record.type === 'A');
  return (
    <div className={`${className} flex flex-col gap-4`}>
      <p className="text-2xl">{t('Point your domain to Homebase')}</p>
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
          <RecordView record={aliasARecord} domain={domain} showStatus={showStatus} />
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
          <RecordView record={fallbackARecord} domain={domain} showStatus={showStatus} />
        </>
      ) : null}
    </div>
  );
};

const SubdomainInfoBlock = ({
  dnsConfig,
  domain,
  showStatus,
  className,
}: {
  dnsConfig: DnsRecord[];
  domain: string;
  showStatus: boolean;
  className: string;
}) => {
  const aliasARecord = dnsConfig.find((record) => record.type === 'ALIAS');
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className={`${className} flex flex-col gap-4`}>
      <p className="text-2xl">Point your domain to Homebase</p>

      {aliasARecord ? (
        <RecordView
          record={{ ...aliasARecord, type: 'CNAME' }}
          domain={domain}
          showStatus={showStatus}
        />
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
          <ApexInfoBlock dnsConfig={dnsConfig} domain={domain} showStatus={false} className="" />
        </DialogWrapper>
      ) : null}
    </div>
  );
};

const RecordView = ({
  record,
  domain,
  subdomain,
  showStatus,
}: {
  record: DnsRecord;
  domain?: string;
  subdomain?: string;
  showStatus: boolean;
}) => {
  const isGood = record.status === 'success';

  return (
    <div
      className={`flex flex-row flex-wrap items-center gap-2 rounded-lg ${
        showStatus ? (isGood ? 'bg-green-100' : 'bg-orange-100') : 'bg-gray-100'
      } px-4 py-3 font-mono text-base shadow-sm`}
    >
      <p>
        {record.name || domain || '@'}
        {subdomain ? `.${subdomain}` : null}
      </p>
      <p>{record.type}</p>
      <p>{record.value}</p>
      {showStatus ? (
        <div className="ml-auto flex flex-row items-center gap-2 text-sm">
          {isGood ? (
            <Check className="h-4 w-4" />
          ) : (
            <>
              {record.status === 'incorrectValue' ? 'Incorrect value' : 'Not found'}
              <Exclamation className="h-4 w-4" />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default DnsSettingsView;
