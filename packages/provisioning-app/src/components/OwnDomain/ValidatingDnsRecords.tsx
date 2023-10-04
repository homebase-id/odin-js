import DnsSettingsView from '../DnsSettingsView/DnsSettingsView';
import ActionButton from '../ui/Buttons/ActionButton';
import { t } from '../../helpers/i18n/dictionary';
import {
  useFetchOwnDomainDnsConfig,
  useFetchOwnDomainDnsStatus,
} from '../../hooks/ownDomain/useOwnDomain';
import { DnsConfig, hasInvalidDnsRecords } from '../../hooks/commonDomain/commonDomain';
import OwnDomainProvisionState from '../../hooks/ownDomain/OwnDomainProvisionState';
import { AlertError } from '../ErrorAlert/ErrorAlert';
import Arrow from '../ui/Icons/Arrow/Arrow';
import { useMemo, useState } from 'react';
import { Alert } from '../ui/Alert/Alert';

interface Props {
  domain: string;
  setProvisionState: React.Dispatch<React.SetStateAction<OwnDomainProvisionState>>;
}

const ValidatingDnsRecords = ({ domain, setProvisionState }: Props) => {
  const [showStatus, setShowStatus] = useState<boolean>(false);
  const refetchNeeded = (dnsConfig: DnsConfig) => hasInvalidDnsRecords(dnsConfig);

  const {
    fetchOwnDomainDnsConfig: { data: initialDnsConfig, error: initialError },
  } = useFetchOwnDomainDnsConfig(domain);

  const {
    fetchOwnDomainDnsStatus: { data: dnsConfig, error: statusError, isFetching },
  } = useFetchOwnDomainDnsStatus(
    showStatus && initialDnsConfig ? domain : undefined,
    refetchNeeded
  );

  const activeDnsConfig = dnsConfig || initialDnsConfig;
  const hasInvalid = useMemo(
    () => (dnsConfig ? hasInvalidDnsRecords(dnsConfig) : true),
    [dnsConfig]
  );
  const statePending = useMemo(
    () => (dnsConfig ? dnsConfig.some((record) => record.status === 'unknown') : false),
    [dnsConfig]
  );

  return (
    <section className="max-w-3xl">
      <AlertError error={statusError || initialError} />
      {activeDnsConfig ? (
        <DnsSettingsView domain={domain} dnsConfig={activeDnsConfig} showStatus={showStatus} />
      ) : null}
      {dnsConfig && !statePending && hasInvalid ? (
        <Alert type="info" className="mt-5">
          {t(
            'Sometimes it can take hours for DNS changes to propogate, please try agian later if you just set them up. Otherwise please inspect your DNS configuration for any incorrect settings.'
          )}
        </Alert>
      ) : null}
      <div className="mt-10 flex flex-row-reverse">
        {hasInvalid ? (
          <ActionButton
            onClick={() => setShowStatus(true)}
            icon={Arrow}
            state={isFetching && statePending ? 'loading' : undefined}
          >
            {t('Validate')}
          </ActionButton>
        ) : (
          <ActionButton icon={Arrow} onClick={() => setProvisionState('Provisioning')}>
            {t('Provision')}
          </ActionButton>
        )}
      </div>
    </section>
  );
};

export default ValidatingDnsRecords;
