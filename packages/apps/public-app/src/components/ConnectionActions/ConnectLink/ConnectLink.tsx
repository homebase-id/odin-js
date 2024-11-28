import { ActionLink, t, useDotYouClientContext, useSecurityContext } from '@homebase-id/common-app';
import { Check, Persons } from '@homebase-id/common-app/icons';
import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';

const ConnectLink = ({ className }: { className: string }) => {
  const dotYouClient = useDotYouClientContext();
  const isAuthenticated = dotYouClient.isAuthenticated();
  const isOwner = dotYouClient.isOwner();

  const host = new DotYouClient({
    hostIdentity: dotYouClient.getLoggedInIdentity(),
    api: ApiType.Guest,
  }).getRoot();

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
