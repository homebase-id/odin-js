import { useEffect, useState } from 'react';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import { t } from '../../helpers/i18n/dictionary';
import EnteringDetails from '../../components/OwnDomain/EnteringDetails';
import ValidatingDnsRecords from '../../components/OwnDomain/ValidatingDnsRecords';
import CreateIdentityView from '../../components/CreateIdentityView/CreateIdentityView';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useCheckInvitationCode } from '../../hooks/invitationCode/useCheckInvitationCode';
import { Times } from '@homebase-id/common-app/icons';
import { OwnDomainProvisionState } from '../../hooks/ownDomain/useOwnDomain';

const LOCAL_EMAIL_STORAGE_KEY = 'email';
const LOCAL_DOMAIN_STORAGE_KEY = 'domain';

const ProvisionOwnDomain = () => {
  const [provisionState, setProvisionState] = useState<OwnDomainProvisionState>('EnteringDetails');

  const [domain, setDomain] = useState<string>(
    window.localStorage?.getItem(LOCAL_DOMAIN_STORAGE_KEY) || ''
  );
  const [email, setEmail] = useState<string>(
    window.localStorage?.getItem(LOCAL_EMAIL_STORAGE_KEY) || ''
  );

  const [searchParams] = useSearchParams();
  const [planId] = useState<string>(searchParams.get('plan-id') || 'free');
  const [invitationCode] = useState<string | null>(searchParams.get('invitation-code'));

  const { data: isValid } = useCheckInvitationCode(invitationCode || undefined).checkInvitationCode;

  useEffect(() => {
    if (provisionState === 'DnsRecords') {
      window.localStorage.setItem(LOCAL_DOMAIN_STORAGE_KEY, domain);
      window.localStorage.setItem(LOCAL_EMAIL_STORAGE_KEY, email);
    }

    if (provisionState === 'Provisioning') {
      window.localStorage.removeItem(LOCAL_DOMAIN_STORAGE_KEY);
      window.localStorage.removeItem(LOCAL_EMAIL_STORAGE_KEY);
    }
  }, [provisionState]);

  if (isValid === false) return <Navigate to={`/${window.location.search}`} />;

  return (
    <section className="mb-10 flex flex-grow flex-col">
      <div className="container mx-auto flex h-full min-h-full flex-grow flex-col px-5">
        <div className={`${provisionState === 'DnsRecords' ? 'mt-10' : 'mt-20'} min-h-[20rem]`}>
          <h1 className="mb-10 text-4xl">
            Homebase | Signup
            <span className="mt-1 block text-3xl text-slate-400">{t('Create a new identity')}</span>
          </h1>
          {provisionState === 'EnteringDetails' ? (
            <EnteringDetails
              domain={domain}
              setDomain={setDomain}
              email={email}
              setEmail={setEmail}
              setProvisionState={setProvisionState}
              invitationCode={invitationCode}
            />
          ) : provisionState === 'DnsRecords' ? (
            <ValidatingDnsRecords domain={domain} setProvisionState={setProvisionState} />
          ) : provisionState === 'Provisioning' ? (
            <CreateIdentityView
              domain={domain}
              email={email}
              planId={planId}
              invitationCode={invitationCode}
            />
          ) : (
            <div>
              <p className="text-lg">
                {t('Mmh something went wrong, and we are not sure what happened exactly...')}{' '}
                {t('Want to try again?')}
              </p>
              <ActionButton
                onClick={() => setProvisionState('EnteringDetails')}
                type="secondary"
                className="mt-3"
                icon={Times}
              >
                {t('Start again')}
              </ActionButton>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProvisionOwnDomain;
