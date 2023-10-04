import { useState } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import InfoDialog from '../Dialog/InfoDialog/InfoDialog';
import Arrow from '../ui/Icons/Arrow/Arrow';
import { DnsConfig, DnsRecord } from '../../hooks/commonDomain/commonDomain';
import Exclamation from '../ui/Icons/Exclamation/Exclamation';
import Question from '../ui/Icons/Question/Question';

const DnsSettingsView = ({
  domain,
  dnsConfig,
  showStatus,
}: {
  domain: string;
  dnsConfig: DnsConfig;
  showStatus?: boolean;
}) => {
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  const dnsRecords = (Object.values(dnsConfig).flat() as Array<DnsRecord>).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <>
      <p className="mb-4">
        {t('Set the following DNS records on your domain')}{' '}
        <span className="rounded-lg bg-slate-50 px-1 py-1">{domain}</span>
        <button onClick={() => setInfoDialogOpen(true)} className="block underline">
          {t('How do I do this?')}
        </button>
      </p>

      <table className="whitespace-no-wrap w-full table-auto text-left">
        <thead>
          <tr>
            <td className="title-font bg-gray-100 px-4 py-3 text-sm font-medium tracking-wider text-gray-900">
              {t('Type')}
            </td>
            <td className="title-font bg-gray-100 px-4 py-3 text-sm font-medium tracking-wider text-gray-900">
              {t('Name')}
            </td>
            <td className="title-font bg-gray-100 px-4 py-3 text-sm font-medium tracking-wider text-gray-900">
              {t('Value')}
            </td>
            <td className="title-font bg-gray-100 px-4 py-3 text-sm font-medium tracking-wider text-gray-900"></td>
          </tr>
        </thead>
        <tbody>
          {dnsRecords.map((dnsRecord, index) => {
            const status = dnsRecord.status;

            return (
              <tr key={index}>
                <td className="border-b-2 border-gray-200 px-4 py-3">{dnsRecord.type}</td>
                <td className="border-b-2 border-gray-200 px-4 py-3">{dnsRecord.name || '@'}</td>
                <td className="border-b-2 border-gray-200 px-4 py-3">{dnsRecord.value}</td>
                <td
                  className={`${
                    showStatus ? 'flex flex-row items-center justify-start' : ''
                  } border-b-2 border-gray-200 px-4 py-3`}
                >
                  {showStatus ? (
                    <>
                      {status === 'incorrectValue' ? (
                        <div className="rounded-lg bg-red-400 p-2 text-white">
                          <Exclamation className="h-5 w-5" />
                        </div>
                      ) : status === 'domainOrRecordNotFound' ? (
                        <div className="rounded-lg bg-blue-400 p-2 text-white">
                          <Question className="h-5 w-5" />
                        </div>
                      ) : null}{' '}
                      <p className="ml-2">{t(status)}</p>
                    </>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

export default DnsSettingsView;
