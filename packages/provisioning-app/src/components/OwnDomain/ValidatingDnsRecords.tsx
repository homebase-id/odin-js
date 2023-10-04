import DnsSettingsView from '../DnsSettingsView/DnsSettingsView';
import ActionButton from '../ui/Buttons/ActionButton';
import { t } from '../../helpers/i18n/dictionary';
import { useFetchOwnDomainDnsStatus } from '../../hooks/ownDomain/useOwnDomain';
import {
  DnsConfig,
  hasInvalidDnsRecords,
} from '../../hooks/commonDomain/commonDomain';
import OwnDomainProvisionState from '../../hooks/ownDomain/OwnDomainProvisionState';
import { AlertError } from '../ErrorAlert/ErrorAlert';
import Arrow from '../ui/Icons/Arrow/Arrow';

interface Props {
  domain: string;
  setProvisionState: React.Dispatch<
    React.SetStateAction<OwnDomainProvisionState>
  >;
}

const ValidatingDnsRecords = ({ domain, setProvisionState }: Props) => {
  const refetchNeeded = (dnsConfig: DnsConfig) =>
    hasInvalidDnsRecords(dnsConfig);

  const {
    fetchOwnDomainDnsStatus: { data: dnsConfig, error },
  } = useFetchOwnDomainDnsStatus(domain, refetchNeeded);

  return (
    <>
      <AlertError error={error} />
      {dnsConfig ? (
        <DnsSettingsView
          domain={domain}
          dnsConfig={dnsConfig}
          showStatus={true}
        />
      ) : null}
      <div className="mt-5 flex flex-row-reverse">
        <ActionButton
          state="idle"
          isDisabled={hasInvalidDnsRecords(dnsConfig)}
          icon={Arrow}
          onClick={() => setProvisionState('Provisioning')}
        >
          {t('Provision')}
        </ActionButton>
      </div>
    </>
  );
};

export default ValidatingDnsRecords;
