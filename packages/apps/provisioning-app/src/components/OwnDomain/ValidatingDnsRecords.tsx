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
      refetch: refetchDnsStatus,
    },
  } = useFetchOwnDomainDnsConfig(domain);

  const {
    createOwnDomainZone: {
      mutateAsync: createOwnDomainZone,
      data: createZoneData,
      error: createZoneError,
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

  // Spinner state for user-initiated validation ONLY. The status query also runs on
  // mount and every 15s in the background - animating the button for those suggested a
  // result was about to appear while the display gate (showStatus) kept it hidden,
  // which read as a glitch.
  const [isValidating, setIsValidating] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Validate is strictly read-only: it re-checks DNS and reveals the statuses.
  // Nothing is created anywhere before the Provision click.
  const validate = async () => {
    setShowStatus(true);
    setIsValidating(true);
    try {
      await refetchDnsStatus();
    } finally {
      setIsValidating(false);
    }
  };

  // Provision is the commit point: create the zone (server creates only if missing and
  // only with proof of domain control - the enabled button implies delegation or valid
  // records, and the server re-proves it regardless), then re-verify once so we know
  // the freshly created zone actually serves before advancing. The re-check is
  // cache-safe: it queries authoritative servers only, never public resolvers.
  const provision = async () => {
    setIsProvisioning(true);
    try {
      if (createZoneData?.created !== true) {
        let result;
        try {
          result = await createOwnDomainZone({ domain, invitationCode });
        } catch {
          // HTTP error (expired invitation code, domain taken, server down) -
          // surfaced via createZoneError; do not advance
          return;
        }
        // Permanent refusals are surfaced by the alerts above; do not advance.
        // (notConfigured is fine: no zone hosting on this deployment - the manual
        // records carried the validation.)
        if (!result.created && result.reason !== 'notConfigured') {
          setShowStatus(true);
          return;
        }
      }

      const { data } = await refetchDnsStatus();
      // Confirmation (not the gating verdict, which is delegation-OR-records and would
      // pass on delegation alone): after zone creation the actual records must resolve,
      // proving the freshly created zone serves. For manual-records users this simply
      // re-confirms their records.
      const records = data?.records ?? [];
      const zoneServes =
        records.some((r) => (r.type === 'A' || r.type === 'ALIAS') && r.status === 'success') &&
        records.filter((r) => r.type === 'CNAME').every((r) => r.status === 'success');
      if (zoneServes) {
        setProvisionState('Provisioning');
      } else {
        // The fresh zone does not serve (yet) - stay here with statuses visible
        setShowStatus(true);
      }
    } finally {
      setIsProvisioning(false);
    }
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
            state={isValidating ? 'loading' : undefined}
          >
            {t('Validate')}
          </ActionButton>
          <ActionButton
            icon={Arrow}
            isDisabled={hasInvalid}
            onClick={provision}
            state={isProvisioning ? 'loading' : undefined}
          >
            {t('Provision')}
          </ActionButton>
        </div>
      </div>
    </section>
  );
};

export default ValidatingDnsRecords;
