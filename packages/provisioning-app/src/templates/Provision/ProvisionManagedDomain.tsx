import { useState } from 'react';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import { t } from '../../helpers/i18n/dictionary';
import EnteringDetails from '../../components/ManagedDomain/EnteringDetails';
import CreateIdentityView from '../../components/CreateIdentityView/CreateIdentityView';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useCheckInvitationCode } from '../../hooks/invitationCode/useCheckInvitationCode';
import { Times } from '@youfoundation/common-app/icons';
import { ManagedDomainProvisionState } from '../../hooks/managedDomain/useManagedDomain';

const Provision = () => {
  const [provisionState, setProvisionState] =
    useState<ManagedDomainProvisionState>('EnteringDetails');
  const [domain, setDomain] = useState<string>(''); // dotted-prefixes + apex, e.g. 'john.doe.id.pub'
  const [email, setEmail] = useState<string>('');

  const [searchParams] = useSearchParams();
  const [planId] = useState<string>(searchParams.get('plan-id') || 'free');
  const [invitationCode] = useState<string | null>(searchParams.get('invitation-code'));

  const { data: isValid } = useCheckInvitationCode(invitationCode || undefined).checkInvitationCode;

  if (!invitationCode || isValid === false) return <Navigate to="/" />;

  return (
    <section className="mb-10 flex flex-grow flex-col">
      <div className="container mx-auto flex h-full min-h-full flex-grow flex-col px-5">
        <div className="mt-20 min-h-[20rem]">
          <h1 className="mb-10 text-4xl">
            Homebase | Signup
            <span className="mt-1 block text-3xl text-slate-400">{t('Create a new identity')}</span>
          </h1>
          {provisionState === 'EnteringDetails' || provisionState === 'CreatingManagedDomain' ? (
            <EnteringDetails
              domain={domain}
              setDomain={setDomain}
              setEmail={setEmail}
              provisionState={provisionState}
              setProvisionState={setProvisionState}
            />
          ) : provisionState === 'Provisioning' && domain ? (
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
                onClick={() => {
                  setProvisionState('EnteringDetails');
                }}
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

export default Provision;
