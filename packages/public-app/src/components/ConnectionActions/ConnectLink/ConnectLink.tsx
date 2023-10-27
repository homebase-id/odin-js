import { useState } from 'react';
import {
  ActionLink,
  Check,
  HOME_ROOT_PATH,
  t,
  useSecurityContext,
} from '@youfoundation/common-app';
import { useAuth } from '../../../hooks/auth/useAuth';
import LoginDialog from '../../Dialog/LoginDialog/LoginDialog';
import { Persons } from '@youfoundation/common-app';

const ConnectLink = ({ className }: { className: string }) => {
  const { isOwner, getIdentity, isAuthenticated } = useAuth();
  const identity = getIdentity();
  const [isLogin, setIsLogin] = useState(false);

  const { data: securityContext } = useSecurityContext(undefined, isAuthenticated).fetch;
  const alreadyConnected = securityContext?.caller?.securityLevel === 'connected' || false;

  if (isOwner) return null;

  return (
    <>
      <ActionLink
        className={`w-auto ${className ?? ''}`}
        href={
          identity
            ? alreadyConnected
              ? `https://${getIdentity()}/owner/connections/${window.location.host}`
              : `https://${getIdentity()}/owner/connections/${window.location.host}/connect`
            : undefined
        }
        onClick={!identity ? () => setIsLogin(true) : undefined}
        icon={alreadyConnected ? Check : Persons}
      >
        {alreadyConnected ? t('Connected') : t('Connect')}
      </ActionLink>

      <LoginDialog
        isOpen={isLogin}
        onCancel={() => setIsLogin(false)}
        title={t('Login required')}
        returnPath={`${HOME_ROOT_PATH}action?targetPath=${`/owner/connections/${window.location.host}/connect`}`}
      >
        {t('You need to login before you can connect')}
      </LoginDialog>
    </>
  );
};

export default ConnectLink;
