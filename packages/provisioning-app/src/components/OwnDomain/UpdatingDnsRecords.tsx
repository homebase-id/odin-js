import DnsSettingsView from '../DnsSettingsView/DnsSettingsView';
import ActionButton from '../ui/Buttons/ActionButton';
import { t } from '../../helpers/i18n/dictionary';
import { useFetchOwnDomainDnsConfig } from '../../hooks/ownDomain/useOwnDomain';
import OwnDomainProvisionState from '../../hooks/ownDomain/OwnDomainProvisionState';
import { AlertError } from '../ErrorAlert/ErrorAlert';
import Arrow from '../ui/Icons/Arrow/Arrow';

interface Props {
  domain: string;
  setProvisionState: React.Dispatch<
    React.SetStateAction<OwnDomainProvisionState>
  >;
}

const UpdatingDnsRecords = ({ domain, setProvisionState }: Props) => {
  const {
    fetchOwnDomainDnsConfig: { data: dnsConfig, error },
  } = useFetchOwnDomainDnsConfig(domain);

  return (
    <>
      <AlertError error={error} />
      {dnsConfig ? (
        <DnsSettingsView
          domain={domain}
          dnsConfig={dnsConfig}
          showStatus={false}
        />
      ) : null}
      <div className="mt-5 flex flex-row-reverse">
        <ActionButton
          state="idle"
          isDisabled={!dnsConfig}
          icon={Arrow}
          onClick={() => setProvisionState('ValidatingDnsRecords')}
        >
          {t('Validate')}
        </ActionButton>
      </div>
    </>
  );
};

export default UpdatingDnsRecords;
