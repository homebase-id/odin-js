import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader, Times } from '@homebase-id/common-app/icons';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import ClaimName from '../../components/ClaimIdentity/ClaimName';
import ConfirmIdentity from '../../components/ClaimIdentity/ConfirmIdentity';
import CreateIdentityView from '../../components/CreateIdentityView/CreateIdentityView';
import { config } from '../../app/config';
import { t } from '../../helpers/i18n/dictionary';
import { useCheckInvitationCode } from '../../hooks/invitationCode/useCheckInvitationCode';
import {
  ManagedDomainApex,
  useFetchManagedDomainsApexes,
} from '../../hooks/managedDomain/useManagedDomain';
import {
  domainFromPrefixAndApex,
  isCompleteLabel,
  prefixesFromClaimedDomain,
} from '../../helpers/common';
import { readCarriedFragment } from '../../helpers/carriedFragment';
import { Region, REGION_NAMES } from '../../helpers/region';
import { useRegionChoice } from '../../hooks/region/useRegionChoice';

type ClaimStep = 'ClaimName' | 'Confirm' | 'Provisioning';

// Two labels, so the identity reads like an actual name rather than a handle
const PREFERRED_APEX = 'id.pub';

// Resolved defensively: the apex list is server config, so it can change without
// this app being rebuilt
const pickInitialApex = (apexes: ManagedDomainApex[]) =>
  apexes.find((apex) => apex.apex === PREFERRED_APEX) ??
  apexes.find((apex) => apex.prefixLabels.length === 2) ??
  apexes[0];

const ClaimIdentity = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [step, setStep] = useState<ClaimStep>('ClaimName');
  const [domainApex, setDomainApex] = useState<ManagedDomainApex | undefined>(undefined);
  const [prefixes, setPrefixes] = useState<string[]>([]);
  // Carried in the fragment across a region redirect - the picker sits on the
  // same step as this field, so changing region emptied it (see ConfirmIdentity)
  const [email, setEmail] = useState<string>(
    () => readCarriedFragment('email')?.toLowerCase() ?? ''
  );

  // The name a region redirect carried over, until this cluster's registry has
  // had its say about it
  const [resumeClaim, setResumeClaim] = useState<string | null>(null);

  const planIdParam = searchParams.get('plan-id');
  const invitationCode = searchParams.get('invitation-code');
  const planId = planIdParam || 'free';

  const { region, source: regionSource, chooseRegion } = useRegionChoice();

  const {
    fetchManagedDomainApexes: { data: managedDomainApexes, error: errorManagedDomainApexes },
  } = useFetchManagedDomainsApexes();

  const { data: isValidInvitationCode } = useCheckInvitationCode(
    invitationCode || undefined
  ).checkInvitationCode;

  useEffect(() => {
    if (domainApex || !managedDomainApexes?.length) return;

    // A region redirect is a full page load onto another host, so the claim
    // travels in the URL. It is restored, never trusted: the registry that
    // called it available belongs to the cluster we just left.
    const claimed = searchParams.get('claim');
    const carried = claimed ? prefixesFromClaimedDomain(claimed, managedDomainApexes) : null;

    const initial = carried?.apex ?? pickInitialApex(managedDomainApexes);
    setDomainApex(initial);
    setPrefixes(carried?.prefixes ?? Array(initial.prefixLabels.length).fill(''));

    if (!claimed) return;

    if (carried) setResumeClaim(domainFromPrefixAndApex(carried.prefixes.join('.'), initial.apex));

    // Consumed once. Left in the URL it would resurrect a stale name on the
    // next reload, outranking whatever the user had typed since.
    const params = new URLSearchParams(searchParams);
    params.delete('claim');
    setSearchParams(params, { replace: true });
  }, [domainApex, managedDomainApexes]);

  // Empty until every label is present and valid, which is also what gates the
  // availability lookup. Values in `prefixes` are already cleaned on input.
  const domainPrefix = useMemo(() => {
    if (!domainApex) return '';

    const labels = domainApex.prefixLabels.map((_, index) => prefixes[index] ?? '');
    return labels.every(isCompleteLabel) ? labels.join('.') : '';
  }, [prefixes, domainApex]);

  const domain = domainFromPrefixAndApex(domainPrefix, domainApex?.apex ?? '');

  // The name rides along so a region change does not send the user back to an
  // empty form. It is re-checked on arrival: the registry that cleared it
  // belongs to the cluster being left, and does not span clusters either. The
  // email travels in the fragment, which never reaches either cluster.
  const onRegionChange = (next: Region) =>
    chooseRegion(next, { carry: { claim: domain }, carryInFragment: { email } });

  const goToOwnDomain = () => {
    // Carry the whole query over — own-domain needs returnUrl too — with the resolved region on top.
    const params = new URLSearchParams(searchParams);
    if (region) params.set('region', region);

    const query = params.toString();
    navigate(`../own-domain${query ? `?${query}` : ''}`);
  };

  if (isValidInvitationCode === false) return <Navigate to={`/${window.location.search}`} />;

  const stepView = (() => {
    if (!domainApex) return <Loader className="mx-auto mb-10 h-20 w-20" />;

    if (step === 'ClaimName')
      return (
        <ClaimName
          apexes={managedDomainApexes ?? []}
          domainApex={domainApex}
          onApexChange={setDomainApex}
          prefixes={prefixes}
          onPrefixesChange={setPrefixes}
          domainPrefix={domainPrefix}
          apexesError={errorManagedDomainApexes}
          autoClaimDomain={resumeClaim}
          onClaim={() => {
            setResumeClaim(null);
            setStep('Confirm');
          }}
          onUseOwnDomain={goToOwnDomain}
        />
      );

    if (step === 'Confirm' && domainPrefix)
      return (
        <ConfirmIdentity
          domainPrefix={domainPrefix}
          domainApex={domainApex.apex}
          email={email}
          onEmailChange={setEmail}
          region={region}
          regionSource={regionSource}
          onRegionChange={onRegionChange}
          invitationCode={invitationCode}
          onBack={() => setStep('ClaimName')}
          onCreated={() => setStep('Provisioning')}
        />
      );

    if (step === 'Provisioning' && domain)
      return (
        <CreateIdentityView
          domain={domain}
          email={email}
          planId={planId}
          invitationCode={invitationCode}
          region={region}
        />
      );

    return (
      <div>
        <p className="text-lg">
          {t('Mmh something went wrong, and we are not sure what happened exactly...')}{' '}
          {t('Want to try again?')}
        </p>
        <ActionButton
          onClick={() => setStep('ClaimName')}
          type="secondary"
          className="mt-3"
          icon={Times}
        >
          {t('Start again')}
        </ActionButton>
      </div>
    );
  })();

  return (
    <section className="mb-10 flex flex-grow flex-col">
      <div className="container mx-auto flex h-full min-h-full flex-grow flex-col px-5">
        <div className="mx-auto mt-20 min-h-[20rem] w-full max-w-xl">
          <div className="mb-10 flex flex-row items-start justify-between gap-4">
            <h1 className="text-4xl">
              {/* Not on 1/2: the region is resolved by then but the user has not been
                  shown it yet, and naming a cluster beside a name they are still
                  typing answers a question nobody has asked. From 2/2 on, where the
                  picker sits, the title says where this identity is going to live. */}
              {config.brandName}
              {step !== 'ClaimName' && region ? ` ${t(REGION_NAMES[region])}` : ''} |{' '}
              {t('Signup')}
              {step !== 'Provisioning' ? (
                <span className="mt-1 block text-3xl text-slate-400">
                  {t('Create a new identity')}
                </span>
              ) : null}
            </h1>
            {step !== 'Provisioning' ? (
              <span className="mt-2 flex-none text-sm tracking-widest text-slate-400">
                {step === 'ClaimName' ? '1 / 2' : '2 / 2'}
              </span>
            ) : null}
          </div>

          {stepView}
        </div>
      </div>
    </section>
  );
};

export default ClaimIdentity;
