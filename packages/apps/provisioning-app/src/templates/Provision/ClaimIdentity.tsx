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
import { domainFromPrefixAndApex, isCompleteLabel } from '../../helpers/common';
import { detectRegion, isRegion, Region, RegionSource } from '../../helpers/region';

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
  const [email, setEmail] = useState<string>('');

  const planIdParam = searchParams.get('plan-id');
  const invitationCode = searchParams.get('invitation-code');
  const planId = planIdParam || 'free';

  // Resolved once, on mount; a re-detect mid-flow would fight the user's choice
  const [{ region, source: regionSource }, setRegionChoice] = useState<{
    region: Region | null;
    source: RegionSource | null;
  }>(() => {
    const param = searchParams.get('region');
    return isRegion(param) ? { region: param, source: null } : detectRegion();
  });

  const {
    fetchManagedDomainApexes: { data: managedDomainApexes, error: errorManagedDomainApexes },
  } = useFetchManagedDomainsApexes();

  const { data: isValidInvitationCode } = useCheckInvitationCode(
    invitationCode || undefined
  ).checkInvitationCode;

  useEffect(() => {
    if (domainApex || !managedDomainApexes?.length) return;

    const initial = pickInitialApex(managedDomainApexes);
    setDomainApex(initial);
    setPrefixes(Array(initial.prefixLabels.length).fill(''));
  }, [domainApex, managedDomainApexes]);

  // Only an explicit choice is mirrored into the URL. Persisting a detected
  // region would freeze one guess forever: a stale ?region= from an earlier
  // visit outranks detection on every later load, so a wrong guess could never
  // correct itself.
  const onRegionChange = (next: Region) => {
    setRegionChoice({ region: next, source: null });

    const params = new URLSearchParams(searchParams);
    params.set('region', next);
    setSearchParams(params, { replace: true });
  };

  // Empty until every label is present and valid, which is also what gates the
  // availability lookup. Values in `prefixes` are already cleaned on input.
  const domainPrefix = useMemo(() => {
    if (!domainApex) return '';

    const labels = domainApex.prefixLabels.map((_, index) => prefixes[index] ?? '');
    return labels.every(isCompleteLabel) ? labels.join('.') : '';
  }, [prefixes, domainApex]);

  const domain = domainFromPrefixAndApex(domainPrefix, domainApex?.apex ?? '');

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
          onClaim={() => setStep('Confirm')}
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
              {config.brandName} | {t('Signup')}
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
