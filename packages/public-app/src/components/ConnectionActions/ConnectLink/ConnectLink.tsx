import { ActionLink, Check, t, useSecurityContext } from '@youfoundation/common-app';
import { useAuth } from '../../../hooks/auth/useAuth';
import { Persons } from '@youfoundation/common-app';

const ConnectLink = ({ className }: { className: string }) => {
  const { isOwner, getIdentity, isAuthenticated } = useAuth();
  const identity = getIdentity();

  const { data: securityContext } = useSecurityContext(undefined, isAuthenticated).fetch;
  const alreadyConnected = securityContext?.caller?.securityLevel === 'connected' || false;

  if (isOwner) return null;

  return (
    <>
      <ActionLink
        className={`w-auto ${className ?? ''}`}
        href={
          identity && alreadyConnected
            ? `https://${getIdentity()}/owner/connections/${window.location.host}`
            : `https://anon.homebase.id/redirect/connections/${window.location.host}/connect`
        }
        icon={alreadyConnected ? Check : Persons}
        type={alreadyConnected ? 'secondary' : 'primary'}
      >
        {alreadyConnected ? t('Connected') : t('Connect')}
      </ActionLink>
    </>
  );
};

export default ConnectLink;
