import { useState } from 'react';
import { t } from '../../../helpers/i18n/dictionary';
import useAuth from '../../../hooks/auth/useAuth';
import LoginDialog from '../../Dialog/LoginDialog/LoginDialog';
import ActionLink from '../../ui/Buttons/ActionLink';
import Persons from '../../ui/Icons/Persons/Persons';

const ConnectLink = ({ className }: { className: string }) => {
  const { isOwner, getIdentity } = useAuth();
  const identity = getIdentity();
  const [isLogin, setIsLogin] = useState(false);

  if (isOwner) {
    return null;
  }

  return (
    <>
      <ActionLink
        className={`w-auto cursor-pointer ${className ?? ''}`}
        href={
          identity
            ? `https://${getIdentity()}/owner/connections/${window.location.host}`
            : undefined
        }
        onClick={!identity ? () => setIsLogin(true) : undefined}
        icon={Persons}
      >
        {t('Connect')}
      </ActionLink>

      <LoginDialog
        isOpen={isLogin}
        onCancel={() => setIsLogin(false)}
        title={t('Login required')}
        returnPath={`/home/action?targetPath=${`/owner/connections/${window.location.host}`}`}
      >
        {t('You need to login before you can connect')}
      </LoginDialog>
    </>
  );
};

export default ConnectLink;
