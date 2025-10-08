import {FormEventHandler, useEffect, useState} from 'react';
import {Helmet} from 'react-helmet-async';

import {useAuth} from '../../hooks/auth/useAuth';

import {MinimalLayout} from '../../components/ui/Layout/Layout';
import UrlNotifier from '../../components/ui/Layout/UrlNotifier/UrlNotifier';

import {useSearchParams} from 'react-router-dom';
import {FIRST_RUN_TOKEN_STORAGE_KEY, SHOULD_USE_AUTOMATED_PASSWORD_RECOVERY} from '../../hooks/configure/useInit';
import {
  ActionButton,
  Alert, CheckboxToggle,
  DomainHighlighter,
  ErrorNotification,
  Label,
  t,
} from '@homebase-id/common-app';
import {Arrow} from '@homebase-id/common-app/icons';
import {PasswordInput} from '../../components/Password/PasswordInput';
import {PasswordStrength} from '../../components/Password/PasswordStrength';

const FirstRun = () => {
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');

  const [state, setState] = useState<'loading' | 'error' | 'success' | undefined>();
  const [error, setError] = useState<unknown | undefined>();
  const {authenticate, finalizeRegistration, canUseAutoRecovery} = useAuth();

  const [hostingEnvironmentSupportsAutomaticPasswordRecovery, setHostingEnvironmentSupportsAutomaticPasswordRecovery]
    = useState<boolean | null>(null);
  const [shouldUseAutomatedPasswordRecovery, setShouldUseAutomatedPasswordRecovery] = useState<boolean>(true);

  const [searchParams] = useSearchParams();
  const firstRunToken = searchParams.get('frt');

  useEffect(() => {
    canUseAutoRecovery().then(
      (canUse) => {
        setHostingEnvironmentSupportsAutomaticPasswordRecovery(canUse);
      }
    )
  }, []);

  const doNext: FormEventHandler = async (e) => {
    e.preventDefault();
    if (state === 'loading') return;
    setState('loading');
    try {
      localStorage.setItem(FIRST_RUN_TOKEN_STORAGE_KEY, firstRunToken || ''); // Store FRT to localStorage, so it can be used on initialize later
      localStorage.setItem(SHOULD_USE_AUTOMATED_PASSWORD_RECOVERY, shouldUseAutomatedPasswordRecovery ? "true" : "false"); // Store option to localStorage, so it can be used on initialize later

      await finalizeRegistration(password, firstRunToken || '');
      await authenticate(password);

      setState('success');
    } catch (ex) {
      setError(ex);
      setState('error');

      console.error(ex);
    }
    return false;
  };

  return (
    <>
      <Helmet>
        <title>Setup | Homebase</title>
      </Helmet>
      <MinimalLayout noShadedBg={true} noPadding={true}>
        <ErrorNotification error={error}/>
        <UrlNotifier/>

        <section className="body-font flex h-full pt-24">
          <div className="container m-auto h-full max-w-[35rem] p-5">
            <form onSubmit={doNext}>
              <h1 className="mb-5 text-4xl dark:text-white">
                Homebase | Setup
                <small className="block break-all text-slate-400 dark:text-slate-500 sm:break-normal">
                  <DomainHighlighter>{window.location.hostname}</DomainHighlighter>
                </small>
              </h1>
              {!firstRunToken ? (
                <>
                  <Alert type="critical">{t('First run token missing')}</Alert>
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <Label htmlFor="password" className="text-sm leading-7 dark:text-gray-400">
                      {t('Password')}
                    </Label>
                    <PasswordInput
                      type="password"
                      name="password"
                      id="password"
                      required
                      onChange={(e) => setPassword(e.target.value)}
                      defaultValue={password}
                      autoComplete="new-password"
                    />
                  </div>
                  <PasswordStrength password={password} className="mb-4"/>

                  <div className="mb-4">
                    <Label
                      htmlFor="retypepassword"
                      className="text-sm leading-7 dark:text-gray-400"
                    >
                      {t('Retype Password')}
                    </Label>
                    <PasswordInput
                      type="password"
                      name="retypePassword"
                      id="retypePassword"
                      required
                      onChange={(e) => setRetypePassword(e.target.value)}
                      defaultValue={retypePassword}
                      autoComplete="new-password"
                    />
                    {password !== retypePassword && retypePassword !== '' ? (
                      <p className="font-semibold text-red-800 dark:text-red-200">
                        {t("Passwords don't match")}
                      </p>
                    ) : null}
                  </div>


                  {hostingEnvironmentSupportsAutomaticPasswordRecovery && (
                    <div className="mb-4 justify-between flex-row w-full">
                      <CheckboxToggle
                        id='enableAutomatedPasswordRecovery'
                        defaultChecked={shouldUseAutomatedPasswordRecovery}
                        onChange={(e) => setShouldUseAutomatedPasswordRecovery(e.currentTarget.checked)}/>
                      <Label
                        htmlFor="enableAutomatedPasswordRecovery"
                        className="ml-5 inline text-sm leading-7 dark:text-gray-400">
                        {t('Enable Automatic Password Recovery')}
                      </Label>
                    </div>)}
                  <ActionButton
                    className="mt-10 w-full px-5 py-3"
                    type="primary"
                    icon={Arrow}
                    state={state}
                    size="none"
                  >
                    {t('Set password & login')}
                  </ActionButton>
                </>
              )}
            </form>
          </div>
        </section>
      </MinimalLayout>
    </>
  );
};

export default FirstRun;
