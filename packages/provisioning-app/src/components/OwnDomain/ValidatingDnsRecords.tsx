import DnsSettingsView from '../DnsSettingsView/DnsSettingsView';
import ActionButton from '../ui/Buttons/ActionButton';
import { t } from '../../helpers/i18n/dictionary';
import { useFetchOwnDomainDnsConfig } from '../../hooks/ownDomain/useOwnDomain';
import { hasInvalidDnsRecords } from '../../hooks/commonDomain/commonDomain';
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

  const {
    fetchOwnDomainDnsConfig: { data: initialDnsConfig, error: initialError },
    fetchOwnDomainDnsStatus: {
      data: dnsConfig,
      error: statusError,
      isFetching,
      refetch: refetchDnsStatus,
    },
  } = useFetchOwnDomainDnsConfig(domain);

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
            onClick={() => {
              setShowStatus(true);
              refetchDnsStatus();
            }}
            icon={Arrow}
            state={isFetching ? 'loading' : undefined}
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
