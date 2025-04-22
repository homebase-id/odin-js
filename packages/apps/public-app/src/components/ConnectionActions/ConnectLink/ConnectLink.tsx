import { ActionLink, t, useOdinClientContext, useSecurityContext } from '@homebase-id/common-app';
import { Check, Persons } from '@homebase-id/common-app/icons';
import { ApiType, OdinClient } from '@homebase-id/js-lib/core';

const ConnectLink = ({ className }: { className: string }) => {
  const odinClient = useOdinClientContext();
  const isAuthenticated = odinClient.isAuthenticated();
  const isOwner = odinClient.isOwner();

  const loggedOnIdentity = odinClient.getLoggedInIdentity();
  const host = loggedOnIdentity
    ? new OdinClient({
        hostIdentity: loggedOnIdentity,
        api: ApiType.Guest,
      }).getRoot()
    : undefined;

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
