import {useState} from 'react';
import {Helmet} from 'react-helmet-async';
import {ActionLink, Alert, DomainHighlighter, t} from '@homebase-id/common-app';
import {RETURN_URL_PARAM, SHAMIR_RECOVERY_PATH, useAuth} from '../../hooks/auth/useAuth';
import {ActionButton} from '@homebase-id/common-app';
import {Label} from '@homebase-id/common-app';
import {MinimalLayout} from '../../components/ui/Layout/Layout';
import UrlNotifier from '../../components/ui/Layout/UrlNotifier/UrlNotifier';
import {PasswordInput} from '../../components/Password/PasswordInput';
import {RecoveredPassword} from './RecoveredPassword';
import {loginHref as loginHrefFor} from '../../hooks/auth/useAuth';
import {PasswordStrength} from '../../components/Password/PasswordStrength';
import {useNavigate, useSearchParams} from "react-router-dom";
import {ApiType} from '@homebase-id/js-lib/core';
import {PasswordRecovery} from '@homebase-id/js-lib/auth';
import {OwnerClient} from '@homebase-id/common-app';
import {recoverFromPhrase, resetPasswordWithResetKey} from '../../provider/auth/ZeroKnowledgeProvider';

const AccountRecovery = () => {
  const [state, setState] = useState<'loading' | 'error' | 'success' | 'idle'>('idle');
  // 'phrase': the phrase first. 'recovered': it opened the password in this browser.
  // 'newPassword': the phrase was not taken over yet, so today's reset with a new password.
  // 'phraseReset': a new password with the phrase's reset key, when there is no recovered password
  // or it doesn't work.
  // 'needsReentry': another recovery reset the password and the phrase can't recover until it is
  // typed in again after a login.
  const [step, setStep] = useState<'phrase' | 'recovered' | 'newPassword' | 'phraseReset' | 'needsReentry'>(
    'phrase'
  );
  const [recovered, setRecovered] = useState<PasswordRecovery>();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get(RETURN_URL_PARAM);
  const returnSuffix = returnUrl ? `?${RETURN_URL_PARAM}=${encodeURIComponent(returnUrl)}` : '';
  const loginHref = loginHrefFor(returnUrl);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');

  const {resetPassword} = useAuth();


  const enterShamirMode = () => {
    navigate(`${SHAMIR_RECOVERY_PATH}${returnSuffix}`);
  }

  const passwordIsValid = password === retypePassword && password !== '';

  const doRecoverWithPhrase = async () => {
    setState('loading');
    try {
      const result = await recoverFromPhrase(new OwnerClient({api: ApiType.Owner}), recoveryKey);
      if (result === 'notTakenOver') {
        setStep('newPassword');
      } else if (result === 'needsReentry') {
        setStep('needsReentry');
      } else {
        setRecovered(result);
        setStep(result.password === undefined ? 'phraseReset' : 'recovered');
      }
      setState('idle');
    } catch (error) {
      console.error(error);
      setState('error');
    }
  };

  const doSetNewPassword = async () => {
    setState('loading');

    const done = step === 'phraseReset' && recovered
      ? await resetPasswordWithResetKey(new OwnerClient({api: ApiType.Owner}), recovered, password)
      : await resetPassword(password, recoveryKey.trim());
    if (done) {
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
        <UrlNotifier/>

        <section className="body-font flex h-full pt-24">
          <div className="container m-auto h-full max-w-[35rem] p-5">
            <div className="">
              <h1 className="mb-5 text-4xl dark:text-white">
                Homebase | {t('Recover access')}
                <small className="block break-all text-slate-400 dark:text-slate-500 sm:break-normal">
                  <DomainHighlighter>{window.location.hostname}</DomainHighlighter>
                </small>
              </h1>
              {step === 'needsReentry' ? (
                <div className="my-2">
                  <p className="mb-3">
                    {t('Your password was reset with another recovery method since you last used your recovery key, so it cannot recover your account until you log in and enter it again.')}
                  </p>
                  <div className="mt-5 flex flex-row-reverse justify-between gap-2">
                    <ActionButton onClick={() => enterShamirMode()}>{t('Use another recovery method')}</ActionButton>
                    <ActionLink type="secondary" href={loginHref}>{t('Cancel')}</ActionLink>
                  </div>
                </div>
              ) : step === 'recovered' ? (
                <RecoveredPassword
                  password={recovered?.password}
                  returnUrl={returnUrl}
                  onReset={() => setStep('phraseReset')}
                />
              ) : state === 'success' ? (
                <div className="my-2">
                  <p>{t('Your password has been changed successfully')}</p>
                  <div className="flex flex-row-reverse">
                    <ActionLink href={loginHref}>{t('Login')}</ActionLink>
                  </div>
                </div>
              ) : state === 'error' ? (
                <>
                  <Alert type="warning" isCompact={true}>
                    {step === 'phrase'
                      ? t('That recovery key does not open your account, check it and try again')
                      : step === 'phraseReset'
                        ? t('Failed to set a new password, try again')
                        : t('Failed to set a new password, check your recovery key and try again')}
                  </Alert>
                  <div className="mt-5 flex flex-row-reverse">
                    <ActionButton onClick={() => setState('idle')}>{t('Try again')}</ActionButton>
                  </div>
                </>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (step === 'phrase') doRecoverWithPhrase();
                  else doSetNewPassword();
                }}>
                  {step === 'phraseReset' ? (
                    <p className="mb-2 max-w-md text-slate-400">
                      {recovered?.password === undefined
                        ? t('Your recovery key is right, but no password was saved with it. Set a new password.')
                        : t('Set a new password with your recovery key.')}
                    </p>
                  ) : (
                  <>
                  <div className="mb-2">
                    <p className="max-w-md text-slate-400">
                      {t('To regain access to your account you will need your recovery key.')}{' '}
                      {t('You received your recovery key when you first signed up')}{' '}
                    </p>
                    <ActionButton className="mt-3 mb-3"
                                  onClick={() => enterShamirMode()}>{t('Click here if you forgot your recovery key')}</ActionButton>
                  </div>
                  <div className="mb-2">
                    <Label>{t('Your recovery key')}</Label>
                    <PasswordInput
                      required
                      name="recoveryKey"
                      id="recoveryKey"
                      type="password"
                      onChange={(e) => setRecoveryKey(e.target.value)}
                      defaultValue={recoveryKey}
                      autoComplete="off"
                    />
                  </div>
                  </>
                  )}
                  {step === 'phrase' ? (
                    <div className="mt-5 flex flex-row-reverse justify-between gap-2">
                      <ActionButton state={state} disabled={recoveryKey.trim() === ''}>
                        {t('Continue')}
                      </ActionButton>
                      <ActionLink type="secondary" href={loginHref}>
                        {t('Cancel')}
                      </ActionLink>
                    </div>
                  ) : (
                  <>
                  <hr className="mb-5 mt-7 dark:border-slate-700"/>
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
                  <PasswordStrength
                    password={password}
                    userInputs={[recoveryKey]}
                    className="mb-2"
                  />
                  <div className="mb-2">
                    <Label htmlFor="retypepassword" className="text-sm leading-7">
                      {t('Retype Password')}
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
                      <p className="py-2 text-red-800 dark:text-red-200">
                        {t("Passwords don't match")}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-5 flex flex-row-reverse justify-between gap-2">
                    <ActionButton state={state} disabled={!passwordIsValid}>
                      {t('Reset password')}
                    </ActionButton>
                    <ActionLink type="secondary" href={loginHref}>
                      {t('Cancel')}
                    </ActionLink>
                  </div>
                  </>
                  )}
                </form>
              )}
            </div>
          </div>
        </section>

      </MinimalLayout>
    </>
  );


};

export default AccountRecovery;
