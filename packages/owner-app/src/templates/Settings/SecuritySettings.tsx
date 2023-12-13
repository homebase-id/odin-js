import { t, Alert, ActionButton, Label, Input } from '@youfoundation/common-app';
import { useState } from 'react';
import Section from '../../components/ui/Sections/Section';
import { useAuth } from '../../hooks/auth/useAuth';

export const SecuritySettings = () => {
  const [state, setState] = useState<'loading' | 'error' | 'success' | 'idle'>('idle');

  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');

  const { changePassword, getDotYouClient, logout } = useAuth();

  const passwordIsValid = password === retypePassword && password !== '';

  const doSetNewPassword = async () => {
    setState('loading');

    if (await changePassword(getDotYouClient(), oldPassword, password)) setState('success');
    else setState('error');
  };

  return (
    <>
      <Section title={t('Change password')}>
        {state === 'success' ? (
          <>
            <p className="my-2">
              {t('Your password has been changed successfully, please login again')}
            </p>
            <div className="mt-5 flex flex-row-reverse">
              <ActionButton onClick={() => logout('/owner/login')}>{t('Open login')}</ActionButton>
            </div>
          </>
        ) : state === 'error' ? (
          <>
            <Alert type="warning" isCompact={true}>
              {t('Failed to set a new password, check your old password and try again')}
            </Alert>
            <div className="mt-5 flex flex-row-reverse">
              <ActionButton onClick={() => setState('idle')}>{t('Try again')}</ActionButton>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              doSetNewPassword();
            }}
          >
            <div className="mb-2">
              <Label>{t('Your current password')}</Label>
              <Input
                required
                name="oldPassword"
                id="oldPassword"
                type="password"
                onChange={(e) => setOldPassword(e.target.value)}
                defaultValue={oldPassword}
                autoComplete="current-password"
              />
            </div>
            <hr className="mb-5 mt-7" />
            <div className="mb-2">
              <Label>{t('New password')}</Label>
              <Input
                required
                name="password"
                id="password"
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                defaultValue={password}
                autoComplete="new-password"
              />
            </div>
            <div className="mb-2">
              <Label htmlFor="retypepassword" className="text-sm leading-7  dark:text-gray-400">
                {t('Retype your new password')}
              </Label>
              <Input
                required
                type="password"
                name="retypePassword"
                id="retypePassword"
                onChange={(e) => setRetypePassword(e.target.value)}
                defaultValue={retypePassword}
                autoComplete="new-password"
              />
              {password !== retypePassword && retypePassword !== '' ? (
                <p className="py-2 text-red-800 dark:text-red-200">{t("Passwords don't match")}</p>
              ) : null}
            </div>
            <div className="mt-5 flex flex-row-reverse">
              <ActionButton state={state} isDisabled={!passwordIsValid}>
                {t('Change password')}
              </ActionButton>
            </div>
          </form>
        )}
      </Section>
    </>
  );
};
