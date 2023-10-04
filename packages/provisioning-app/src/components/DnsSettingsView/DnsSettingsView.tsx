import { useState } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import InfoDialog from '../Dialog/InfoDialog/InfoDialog';
import Arrow from '../ui/Icons/Arrow/Arrow';
import { DnsConfig, DnsRecord } from '../../hooks/commonDomain/commonDomain';
import Exclamation from '../ui/Icons/Exclamation/Exclamation';
import Check from '../ui/Icons/Check/Check';
import Loader from '../ui/Icons/Loader/Loader';
// import { useApexDomain } from '../../hooks/ownDomain/useOwnDomain';

const DnsSettingsView = ({
  domain,
  dnsConfig,
  showStatus,
}: {
  domain: string;
  dnsConfig: DnsConfig;
  showStatus?: boolean;
}) => {
  // const { data: apexDomain } = useApexDomain(domain);
  // console.log({ apexDomain });

  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  const aliasARecord = dnsConfig.find((record) => record.type === 'ALIAS');
  const fallbackARecord = dnsConfig.find((record) => record.type === 'A');

  const subRecords = dnsConfig.filter((record) => !!record.name);
  return (
    <>
      <section className="">
        <p className="mb-4">
          <button onClick={() => setInfoDialogOpen(true)} className="block underline">
            {t('How do I do this?')}
          </button>
        </p>

        <div className="mb-10 flex flex-col gap-4">
          <p className="text-2xl">Point your domain to Homebase</p>
          {aliasARecord ? (
            <>
              <p>
                <span className="font-medium">Recommended:</span>
                <br />
                Point ALIAS, ANAME, or flattened CNAME record to {aliasARecord.value}
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
                <span className="font-medium">Fallback:</span>
                <br />
                Point A record to {fallbackARecord?.value}
              </p>
              <p className="text-sm text-slate-400">
                If your DNS provider does not support ALIAS, ANAME, or flattened CNAME records, use
                this fallback option.
              </p>
              <RecordView record={fallbackARecord} domain={domain} showStatus={showStatus} />
            </>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <p className="mb-5 text-2xl">Add the required subdomains</p>
          {subRecords.length > 0 ? (
            <>
              {subRecords.map((record) => (
                <RecordView key={record.name} record={record} showStatus={showStatus} />
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
              Cloudflare Documentation
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
              One.com Documentation
              <Arrow className="ml-auto h-4 w-4" />
            </a>
          </div>
        </>
      </InfoDialog>
    </>
  );
};

const RecordView = ({
  record,
  domain,
  showStatus,
}: {
  record: DnsRecord;
  domain?: string;
  showStatus: boolean;
}) => {
  const isGood = record.status === 'success';
  const isLoading = record.status === 'unknown';

  return (
    <div
      className={`flex flex-row items-center gap-2 rounded-lg ${
        showStatus && !isLoading ? (isGood ? 'bg-green-100' : 'bg-orange-100') : 'bg-gray-100'
      } px-4 py-3 font-mono text-base shadow-sm`}
    >
      <p>{record.name || domain || '@'}</p>
      <p>{record.type}</p>
      <p>{record.value}</p>
      {showStatus ? (
        <div className="ml-auto">
          {isLoading ? (
            <Loader className="h-4 w-4" />
          ) : isGood ? (
            <Check className="h-4 w-4" />
          ) : (
            <Exclamation className="h-4 w-4" />
          )}
        </div>
      ) : null}
    </div>
  );
};

export default DnsSettingsView;
