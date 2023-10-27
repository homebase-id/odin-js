import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ActionLink, Alert, DomainHighlighter, t } from '@youfoundation/common-app';
import { useAuth } from '../../hooks/auth/useAuth';
import { ActionButton } from '@youfoundation/common-app';
import { Input } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import { MinimalLayout } from '../../components/ui/Layout/Layout';
import UrlNotifier from '../../components/ui/Layout/UrlNotifier/UrlNotifier';

const Login = () => {
  const [state, setState] = useState<'loading' | 'error' | 'success' | 'idle'>('idle');

  const [recoveryKey, setRecoveryKey] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');

  const { resetPassword } = useAuth();

  const passwordIsValid = password === retypePassword && password !== '';

  const doSetNewPassword = async () => {
    setState('loading');

    if (await resetPassword(password, recoveryKey.replace(/ /g, ''))) {
      setState('success');
    } else {
      setState('error');
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('Recover access to your account')} | Homebase</title>
      </Helmet>
      <MinimalLayout noShadedBg={true} noPadding={true}>
        <UrlNotifier />
        <section className="body-font flex h-full pt-24">
          <div className="container m-auto h-full max-w-[35rem] p-5">
            <div className="">
              <h1 className="mb-5 text-4xl dark:text-white">
                Homebase | {t('Recover access')}
                <small className="block break-all text-slate-400 dark:text-slate-500 sm:break-normal">
                  <DomainHighlighter>{window.location.hostname}</DomainHighlighter>
                </small>
              </h1>
              {state === 'success' ? (
                <div className="my-2">
                  <p>{t('Your password has been changed successfully')}</p>
                  <div className="flex flex-row-reverse">
                    <ActionLink href="/owner/login">{t('Login')}</ActionLink>
                  </div>
                </div>
              ) : state === 'error' ? (
                <>
                  <Alert type="warning" isCompact={true}>
                    {t('Failed to set a new password, check your recovery key and try again')}
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
                    <p className="max-w-md text-slate-400">
                      {t('To regain access to your account you will need your recovery key.')}{' '}
                      {t('You have gotten your recovery key when you first signed up')}
                    </p>
                  </div>
                  <div className="mb-2">
                    <Label>{t('Your recovery key')}</Label>
                    <Input
                      required
                      name="recoveryKey"
                      id="recoveryKey"
                      type="password"
                      onChange={(e) => setRecoveryKey(e.target.value)}
                      defaultValue={recoveryKey}
                      autoComplete="off"
                    />
                  </div>
                  <hr className="mb-5 mt-7 dark:border-slate-700" />
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
                    <Label htmlFor="retypepassword" className="text-sm leading-7">
                      {t('Retype Password')}
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
                      <p className="py-2 text-red-800 dark:text-red-200">
                        {t("Passwords don't match")}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-5 flex flex-row-reverse justify-between gap-2">
                    <ActionButton state={state} isDisabled={!passwordIsValid}>
                      {t('Reset password')}
                    </ActionButton>
                    <ActionLink type="secondary" href="/owner/login">
                      {t('Cancel')}
                    </ActionLink>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </MinimalLayout>
    </>
  );
};

export default Login;
