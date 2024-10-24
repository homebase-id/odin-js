import { ActionLink, t, useSecurityContext } from '@homebase-id/common-app';
import { useAuth } from '../../../hooks/auth/useAuth';
import { Check, Persons } from '@homebase-id/common-app/icons';

const ConnectLink = ({ className }: { className: string }) => {
  const { isOwner, getDotYouClient, isAuthenticated } = useAuth();
  const host = getDotYouClient().getRoot();

  const { data: securityContext } = useSecurityContext(undefined, isAuthenticated).fetch;
  const isConnected =
    securityContext?.caller?.securityLevel?.toLowerCase() === 'connected' || false;

  if (isOwner) return null;

  return (
    <>
      <ActionLink
        className={`w-auto ${className ?? ''}`}
        href={
          host && isConnected
            ? `${host}/owner/connections/${window.location.host}`
            : `${import.meta.env.VITE_CENTRAL_LOGIN_HOST}/redirect/owner/connections/${window.location.host}/connect`
        }
        icon={isConnected ? Check : Persons}
        type={isConnected ? 'secondary' : 'primary'}
      >
        {isConnected ? t('Connected') : t('Connect')}
      </ActionLink>
    </>
  );
};

export default ConnectLink;
