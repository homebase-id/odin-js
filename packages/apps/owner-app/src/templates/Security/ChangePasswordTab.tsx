import {
  t,
  Alert,
  ActionButton,
  Label,
  logoutOwnerAndAllApps,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import {useState} from 'react';
import Section from '../../components/ui/Sections/Section';
import {useAuth} from '../../hooks/auth/useAuth';
import {PasswordInput} from '../../components/Password/PasswordInput';
import {PasswordStrength} from '../../components/Password/PasswordStrength';
import {hasDebugFlag} from "@homebase-id/js-lib/helpers";

export const ChangePasswordTab = () => {
  const [state, setState] = useState<'loading' | 'error' | 'success' | 'idle'>('idle');

  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');

  const {changePassword} = useAuth();
  const dotYouClient = useDotYouClientContext();

  const passwordIsValid = password === retypePassword && password !== '';

  const doSetNewPassword = async () => {
    setState('loading');

    if (await changePassword(dotYouClient, oldPassword, password)) setState('success');
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
              <ActionButton onClick={logoutOwnerAndAllApps}>{t('Open login')}</ActionButton>
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

              if (e.currentTarget.reportValidity()) {
                doSetNewPassword();
              }
            }}
          >
            <div className="mb-2">
              <Label>{t('Your current password')}</Label>
              <PasswordInput
                required
                name="oldPassword"
                id="oldPassword"
                type="password"
                onChange={(e) => setOldPassword(e.target.value)}
                defaultValue={oldPassword}
                autoComplete="current-password"
              />
            </div>
            <hr className="mb-5 mt-7"/>
            <div className="mb-2">
              <Label>{t('New password')}</Label>
              <PasswordInput
                required
                name="password"
                id="password"
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                defaultValue={password}
                autoComplete="new-password"
              />
            </div>

            <PasswordStrength password={password} userInputs={[oldPassword]} className="mb-2"/>

            <div className="mb-2">
              <Label htmlFor="retypepassword" className="text-sm leading-7 dark:text-gray-400">
                {t('Retype your new password')}
              </Label>
              <PasswordInput
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
              <ActionButton state={state} disabled={!passwordIsValid}>
                {t('Change password')}
              </ActionButton>
            </div>
          </form>
        )}
      </Section>
    </>
  );
};
