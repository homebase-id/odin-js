import DnsSettingsView from '../DnsSettingsView/DnsSettingsView';
import ActionButton from '../ui/Buttons/ActionButton';
import { t } from '../../helpers/i18n/dictionary';
import {
  OwnDomainProvisionState,
  useCreateOwnDomainZone,
  useFetchOwnDomainDnsConfig,
} from '../../hooks/ownDomain/useOwnDomain';
import { AlertError } from '../ErrorAlert/ErrorAlert';
import { useMemo, useState } from 'react';
import { Alert } from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';

interface Props {
  domain: string;
  invitationCode: string | null;
  setProvisionState: React.Dispatch<React.SetStateAction<OwnDomainProvisionState>>;
}

const ValidatingDnsRecords = ({ domain, invitationCode, setProvisionState }: Props) => {
  const {
    fetchOwnDomainDnsConfig: { data: initialDnsConfig, error: initialError },
    fetchOwnDomainDnsStatus: {
      data: dnsStatus,
      isFetched: isDnsStateFetched,
      error: statusError,
      isFetching,
      refetch: refetchDnsStatus,
    },
  } = useFetchOwnDomainDnsConfig(domain);

  const {
    createOwnDomainZone: {
      mutateAsync: createOwnDomainZone,
      data: createZoneData,
      error: createZoneError,
      status: createZoneStatus,
    },
  } = useCreateOwnDomainZone();

  const activeDnsConfig = dnsStatus?.records || initialDnsConfig;
  // The server owns the success rule; 200 vs 202 arrives as dnsStatus.success
  const hasInvalid = !dnsStatus?.success;
  const statePending = useMemo(
    () => (dnsStatus ? dnsStatus.records.some((record) => record.status === 'unknown') : false),
    [dnsStatus]
  );

  const [showStatus, setShowStatus] = useState(false);
  const canShowStatus = isDnsStateFetched && !statePending;

  const validate = async () => {
    setShowStatus(true);
    // The zone is created server-side only once domain control is provable (NS delegation
    // visible at the parent, or valid manual records). Retried on every Validate until it
    // succeeds; controlNotProven is the expected state before the user's DNS setup lands.
    // HTTP errors (expired invitation code, domain taken) surface via AlertError below.
    if (createZoneData?.created !== true) {
      try {
        await createOwnDomainZone({ domain, invitationCode });
      } catch {
        // surfaced via createZoneError
      }
    }
    refetchDnsStatus();
  };

  return (
    <section className="max-w-3xl">
      <AlertError error={statusError || initialError || createZoneError} />
      {createZoneData?.reason === 'shadowsHostedZone' ? (
        <Alert type="critical" className="mb-5">
          {t(
            `${domain} is part of a domain that is already hosted on Homebase, so it cannot be set up as its own identity domain this way.`
          )}
        </Alert>
      ) : null}
      {activeDnsConfig ? (
        <DnsSettingsView
          domain={domain}
          dnsConfig={activeDnsConfig}
          showStatus={showStatus && canShowStatus}
        />
      ) : null}
      {dnsStatus && hasInvalid && showStatus ? (
        <Alert type="info" className="mt-5">
          {t(
            'Sometimes it can take hours for DNS changes to propagate, please try again later if you just set them up. Otherwise, please inspect your DNS configuration for any incorrect settings.'
          )}
        </Alert>
      ) : null}
      <div className="mt-10 flex flex-row-reverse justify-between gap-2">
        {hasInvalid ? (
          <ActionButton
            onClick={validate}
            icon={Arrow}
            state={isFetching || createZoneStatus === 'pending' ? 'loading' : undefined}
          >
            {t('Validate')}
          </ActionButton>
        ) : (
          <ActionButton icon={Arrow} onClick={() => setProvisionState('Provisioning')}>
            {t('Provision')}
          </ActionButton>
        )}
        <ActionButton type="secondary" onClick={() => setProvisionState('EnteringDetails')}>
          {t('« Back')}
        </ActionButton>
      </div>
    </section>
  );
};

export default ValidatingDnsRecords;
