import DnsSettingsView from '../DnsSettingsView/DnsSettingsView';
import ActionButton from '../ui/Buttons/ActionButton';
import { t } from '../../helpers/i18n/dictionary';
import {
  OwnDomainProvisionState,
  useFetchOwnDomainDnsConfig,
} from '../../hooks/ownDomain/useOwnDomain';
import { hasInvalidDnsRecords } from '../../hooks/commonDomain/commonDomain';
import { AlertError } from '../ErrorAlert/ErrorAlert';
import { useMemo } from 'react';
import { Alert } from '@youfoundation/common-app';
import { Arrow } from '@youfoundation/common-app/icons';

interface Props {
  domain: string;
  setProvisionState: React.Dispatch<React.SetStateAction<OwnDomainProvisionState>>;
}

const ValidatingDnsRecords = ({ domain, setProvisionState }: Props) => {
  const {
    fetchOwnDomainDnsConfig: { data: initialDnsConfig, error: initialError },
    fetchOwnDomainDnsStatus: {
      data: dnsConfig,
      isFetched: isDnsStateFetched,
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

  const showStatus = isDnsStateFetched && !statePending;

  return (
    <section className="max-w-3xl">
      <AlertError error={statusError || initialError} />
      {activeDnsConfig ? (
        <DnsSettingsView domain={domain} dnsConfig={activeDnsConfig} showStatus={showStatus} />
      ) : null}
      {dnsConfig && hasInvalid && showStatus ? (
        <Alert type="info" className="mt-5">
          {t(
            'Sometimes it can take hours for DNS changes to propagate, please try again later if you just set them up. Otherwise, please inspect your DNS configuration for any incorrect settings.'
          )}
        </Alert>
      ) : null}
      <div className="mt-10 flex flex-row-reverse">
        {hasInvalid ? (
          <ActionButton
            onClick={() => refetchDnsStatus()}
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
