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
import { Arrow, Refresh } from '@homebase-id/common-app/icons';

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
  // A fully valid setup shows its green statuses without requiring a Validate click -
  // e.g. returning to this step when the DNS was configured earlier
  const effectiveShowStatus = (showStatus || dnsStatus?.success === true) && canShowStatus;

  // The zone is created server-side only once domain control is provable (NS delegation
  // visible at the parent, or valid manual records). Retried until it succeeds;
  // controlNotProven is the expected state before the user's DNS setup lands. HTTP
  // errors (expired invitation code, domain taken) surface via AlertError below.
  const ensureZone = async () => {
    if (createZoneData?.created === true) return;
    try {
      await createOwnDomainZone({ domain, invitationCode });
    } catch {
      // surfaced via createZoneError
    }
  };

  const validate = async () => {
    setShowStatus(true);
    await ensureZone();
    refetchDnsStatus();
  };

  const provision = async () => {
    // Ensure the zone also on Provision: validation can turn green via the background
    // poll alone (which never creates zones), so this click may be the first
    // control-proven moment. Idempotent; the server re-proves control either way, and
    // create-identity-on-domain re-validates DNS server-side - a force-enabled button
    // gains nothing.
    await ensureZone();
    setProvisionState('Provisioning');
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
      ) : createZoneData?.reason === 'zoneAlreadyHosted' ? (
        <Alert type="critical" className="mb-5">
          {t(
            `A DNS zone for ${domain} is already hosted on Homebase - most likely it serves an existing identity. It cannot be claimed here. If this is your domain and you believe this is wrong, please contact support.`
          )}
        </Alert>
      ) : null}
      {activeDnsConfig ? (
        <DnsSettingsView domain={domain} dnsConfig={activeDnsConfig} showStatus={effectiveShowStatus} />
      ) : null}
      {dnsStatus && hasInvalid && showStatus ? (
        <Alert type="info" className="mt-5">
          {t(
            'Sometimes it can take hours for DNS changes to propagate, please try again later if you just set them up. Otherwise, please inspect your DNS configuration for any incorrect settings.'
          )}
        </Alert>
      ) : null}
      <div className="mt-10 flex flex-row justify-between gap-2">
        <ActionButton type="secondary" onClick={() => setProvisionState('EnteringDetails')}>
          {t('« Back')}
        </ActionButton>
        <div className="flex flex-row gap-2">
          <ActionButton
            type="secondary"
            icon={Refresh}
            onClick={validate}
            state={isFetching || createZoneStatus === 'pending' ? 'loading' : undefined}
          >
            {t('Validate')}
          </ActionButton>
          <ActionButton icon={Arrow} isDisabled={hasInvalid} onClick={provision}>
            {t('Provision')}
          </ActionButton>
        </div>
      </div>
    </section>
  );
};

export default ValidatingDnsRecords;
