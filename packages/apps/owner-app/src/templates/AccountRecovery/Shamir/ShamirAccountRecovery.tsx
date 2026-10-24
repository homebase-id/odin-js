import {useEffect, useRef, useState} from 'react';
import {Helmet} from 'react-helmet-async';
import {ActionButton, ActionLink, Alert, DomainHighlighter, Label, t} from '@homebase-id/common-app';
import {MinimalLayout} from '../../../components/ui/Layout/Layout';
import UrlNotifier from '../../../components/ui/Layout/UrlNotifier/UrlNotifier';
import {Arrow} from "@homebase-id/common-app/icons";
import {useLocation, useNavigate} from "react-router-dom";
import {ApiType} from '@homebase-id/js-lib/core';
import {PasswordRecovery} from '@homebase-id/js-lib/auth';
import {OwnerClient} from '@homebase-id/common-app';
import {
  enterRecoveryMode,
  exitRecoveryMode,
  finalizeRecovery,
  forgetRecoveryKey,
  getRecoveryStatusForThisBrowser,
  initiateRecoveryMode,
  recoverWithApprovedFriends,
  ShamirRecoveryState,
  ShamirRecoveryStatusRedacted,
} from "../../../provider/auth/SecurityRecoveryProvider";
import {resetPasswordWithResetKey} from "../../../provider/auth/ZeroKnowledgeProvider";
import {PasswordInput} from "../../../components/Password/PasswordInput";
import {PasswordStrength} from "../../../components/Password/PasswordStrength";
import {RETURN_URL_PARAM} from "../../../hooks/auth/useAuth";
import {RecoveredPassword, loginHref} from "../RecoveredPassword";

const ShamirAccountRecovery = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const returnUrl = params.get(RETURN_URL_PARAM);
  const enterNonceId = params.get("enter");
  const entering = useRef(false);

  const [status, setStatus] = useState<ShamirRecoveryStatusRedacted | null>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [thisBrowser, setThisBrowser] = useState<boolean>(false);
  // A reset with the friends' reset key ends recovery (state None): the page keeps saying it worked
  const [passwordReset, setPasswordReset] = useState<boolean>(false);

  // see if we came here from recovery mode
  const fromVerification = params.get("fv") === "1";
  const nonceId = params.get("id");
  const token = params.get("token");
  const fromFinalize = nonceId && token;
  const recoveryState = status?.state ?? ShamirRecoveryState.None;

  /** `sentNotice`: what to say once the email is on its way, if anything. */
  const startRecoveryMode = async (sentNotice?: string) => {
    try {
      setErrorMessage(null); // clear previous
      setNotice(null);
      if ((await initiateRecoveryMode()) && sentNotice) setNotice(sentNotice);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setErrorMessage(error.message ? t(error.message) : t("An unexpected error occurred."));
    }
    await reloadStatus();
  };

  // A recovery whose throwaway key is another browser's (an automated deal's has none)
  const anotherBrowsers = status?.recoveryKeyId != null && !thisBrowser;

  // Only the email goes out; recovery goes on until the owner confirms with it
  const cancelRecoveryMode = async () => {
    setErrorMessage(null);
    if (await exitRecoveryMode()) {
      setNotice(t('Check your email to confirm leaving recovery mode.'));
    } else {
      setNotice(null);
      setErrorMessage(t('The email to leave recovery mode could not be sent. Try again.'));
    }
  }

  const reloadStatus = async () => {
    getRecoveryStatusForThisBrowser().then(({status: result, thisBrowser: isThisBrowser}) => {
      // A notice belongs to the state it was shown in
      setStatus((previous) => {
        if (previous?.state !== result?.state) setNotice(null);
        return result;
      });
      setThisBrowser(isThisBrowser);
      setLoaded(true);
    });
  };

  // The email link lands here: this browser posts its nonce back with its throwaway key
  useEffect(() => {
    if (!enterNonceId || entering.current) return;
    entering.current = true;
    enterRecoveryMode(enterNonceId).then((error) => {
      if (error) setErrorMessage(t(error));
      navigate(location.pathname, {replace: true});
      reloadStatus();
    });
  }, [enterNonceId]);

  useEffect(() => {
    // run immediately on mount
    reloadStatus();

    // then run every 10 seconds
    const intervalId = setInterval(() => {
      reloadStatus();
    }, 5 * 1000);

    return () => clearInterval(intervalId); // cleanup on unmount
  }, []);

  if ((fromVerification || fromFinalize || enterNonceId) && !loaded) {
    // we need to wait until we get the status
    return <div>Please wait...</div>
  }

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
              {errorMessage && recoveryState !== ShamirRecoveryState.None && (
                <Alert type="critical" isCompact={false} className="mb-3">
                  {errorMessage}
                </Alert>
              )}
              {notice && (
                <Alert type="info" isCompact={false} className="mb-3">
                  {notice}
                </Alert>
              )}
              {passwordReset ? (
                <div className="my-2">
                  <p>{t('Your password has been changed successfully')}</p>
                  <div className="flex flex-row-reverse">
                    <ActionLink href={loginHref(returnUrl)}>{t('Login')}</ActionLink>
                  </div>
                </div>
              ) : recoveryState === ShamirRecoveryState.AwaitingOwnerEmailVerificationToEnterRecoveryMode ? (
                <div className="my-2">
                  <p>{t('We sent an email to the one you used during signup.  Click the link in this email to continue.')}</p>
                  <p className="mt-3">Email: <b>{status?.email}</b></p>
                  <hr className="mb-5 mt-7 dark:border-slate-700"/>

                  <div className="flex flex-row-reverse">
                    <ActionButton className="mt-3 mb-3"
                                  onClick={() => startRecoveryMode()}>
                      {t('Send it again')}
                      <Arrow className="ml-auto h-5 w-5"/>
                    </ActionButton>
                  </div>
                </div>
              ) : recoveryState === ShamirRecoveryState.AwaitingSufficientDelegateConfirmation ? (<>
                  {t('We notified your trusted connections that you are in recovery mode.  Forget who they were?  ' +
                    'Check the email we sent when you entered recovery mode.')}

                  <Alert type="warning" isCompact={false} className="mt-3">
                    {t('We are waiting for a sufficient number of your delegates to confirm')}
                  </Alert>

                  <hr className="mb-5 mt-7 dark:border-slate-700"/>

                  {anotherBrowsers && (
                    <p className="mt-3 text-slate-400">
                      {t('Recovery is under way in another browser; finish it there, or exit it by email first')}
                    </p>
                  )}

                  <div className="flex flex-row-reverse justify-between">
                    {!anotherBrowsers && (
                      <ActionButton className="mt-3 mb-3"
                                    onClick={() => startRecoveryMode(t('Check your email: the link asks your friends again.'))}>
                        {t('Start over')}
                        <Arrow className="ml-auto h-5 w-5"/>
                      </ActionButton>
                    )}

                    <ActionButton
                      type="secondary"
                      className="mt-3 mb-3"
                      onClick={() => cancelRecoveryMode()}>
                      {t('Exit recovery mode')}
                    </ActionButton>
                  </div>
                </>
              ) : recoveryState === ShamirRecoveryState.AwaitingRecoveringBrowser ? (
                <FriendsApproved
                  returnUrl={returnUrl}
                  thisBrowser={thisBrowser}
                  onCancel={() => cancelRecoveryMode()}
                  onPasswordReset={() => setPasswordReset(true)}
                />
              ) : recoveryState === ShamirRecoveryState.AwaitingOwnerFinalization ? (<>
                  {t('🎉 You are ready to finalize your password recovery!')}

                  <hr className="mb-5 mt-7 dark:border-slate-700"/>
                  {token && nonceId && (
                    <PasswordReset returnUrl={returnUrl} setNewPassword={(password) => finalizeRecovery(nonceId, token, password)}/>
                  )}

                  {/*user is on the screen but did not click the email*/}
                  {(!token || !nonceId) && (
                    <>
                      <div className="my-2">
                        <p>{t('We sent an email including your final recovery link.  Click the link in this email to continue.')}</p>
                        <p className="mt-3">Email: <b>{status?.email}</b></p>
                        <hr className="mb-5 mt-7 dark:border-slate-700"/>
                      </div>

                      <div className="my-2">
                        <ActionButton
                          type="secondary"
                          className="mt-3 mb-3"
                          onClick={() => cancelRecoveryMode()}>
                          {t('Exit recovery mode')}
                        </ActionButton>
                      </div>
                    </>
                  )}


                </>
              ) : recoveryState === ShamirRecoveryState.AwaitingOwnerEmailVerificationToExitRecoveryMode ? (
                <div className="my-2">
                  <p>{t('We sent an email to the one you used during signup.  Click the link in this email to continue ' +
                    'exiting recovery mode.')}</p>
                  <p className="mt-3">Email: <b>{status?.email}</b></p>
                  <hr className="mb-5 mt-7 dark:border-slate-700"/>

                  <div className="flex flex-row-reverse">
                    <ActionButton className="mt-3 mb-3"
                                  onClick={() => cancelRecoveryMode()}>
                      {t('Send it again')}
                      <Arrow className="ml-auto h-5 w-5"/>
                    </ActionButton>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}>
                  <div className="mb-2">
                    <p className="max-w-md text-slate-400">
                      {t('To regain access you will need to initiate recovery mode.')}{' '}
                      {t('Click the button below to send an email to the email address you used during signup.')}{' '}
                    </p>

                    {errorMessage && (
                      <Alert type="critical" isCompact={false} className="mt-3">
                        {errorMessage}
                      </Alert>
                    )}

                    <ActionButton className="mt-3 mb-3"
                                  onClick={() => startRecoveryMode()}>
                      {t('Enter Recovery mode now')}
                      <Arrow className="ml-auto h-5 w-5"/>
                    </ActionButton>
                  </div>
                  {/*<hr className="mb-5 mt-7 dark:border-slate-700"/>*/}

                </form>
              )}
            </div>
          </div>
        </section>

      </MinimalLayout>
    </>
  );
};


/**
 * Recovery with friends, once enough approved: this browser opens their shards, rebuilds the
 * secret and shows the password, as recovery with the phrase does; or, with no password copy or
 * one that doesn't log in, sets a new password with the friends' reset key.
 */
function FriendsApproved({returnUrl, thisBrowser, onCancel, onPasswordReset}: {
  returnUrl: string | null;
  thisBrowser: boolean;
  onCancel: () => void;
  onPasswordReset: () => void;
}) {
  const [recovered, setRecovered] = useState<PasswordRecovery>();
  const [resetting, setResetting] = useState(false);
  const [state, setState] = useState<'loading' | 'error' | 'idle'>('idle');

  // Only the browser whose key the friends sealed to can open their shards
  if (!recovered && !thisBrowser) {
    return (
      <div className="my-2">
        <p>{t('Your friends have approved, but this is not the browser where you started recovery. Open this page there.')}</p>
        <div className="mt-5 flex flex-row-reverse">
          <ActionButton type="secondary" onClick={onCancel}>{t('Exit recovery mode')}</ActionButton>
        </div>
      </div>
    );
  }

  const open = async () => {
    setState('loading');
    try {
      const result = await recoverWithApprovedFriends();
      setRecovered(result);
      setResetting(result.password === undefined);
      setState('idle');
    } catch (error) {
      console.error(error);
      setState('error');
    }
  };

  if (!recovered) {
    return (
      <div className="my-2">
        <p>{t('🎉 Enough of your friends have approved your recovery.')}</p>
        {state === 'error' && (
          <Alert type="warning" isCompact={true} className="mt-3">
            {t('Your friends\' shards did not open your account. Exit recovery mode and start again.')}
          </Alert>
        )}
        <div className="mt-5 flex flex-row-reverse justify-between gap-2">
          <ActionButton state={state === 'loading' ? 'loading' : undefined} onClick={() => open()}>
            {t('Show my password')}
            <Arrow className="ml-auto h-5 w-5"/>
          </ActionButton>
          <ActionButton type="secondary" onClick={onCancel}>{t('Exit recovery mode')}</ActionButton>
        </div>
      </div>
    );
  }

  if (resetting) {
    return (
      <>
        <p className="mb-2 max-w-md text-slate-400">
          {recovered.password === undefined
            ? t('Your friends opened your account, but no password was saved with it. Set a new password.')
            : t('Set a new password with your friends\' approval.')}
        </p>
        <PasswordReset
          returnUrl={returnUrl}
          setNewPassword={async (password) => {
            const done = await resetPasswordWithResetKey(new OwnerClient({api: ApiType.Owner}), recovered, password);
            if (done) {
              // The reset ended recovery: the key is spent
              forgetRecoveryKey();
              onPasswordReset();
            }
            return done;
          }}
        />
      </>
    );
  }

  return (
    <RecoveredPassword
      password={recovered.password}
      returnUrl={returnUrl}
      onReset={() => setResetting(true)}
    />
  );
}

function PasswordReset({returnUrl, setNewPassword}: {
  returnUrl: string | null;
  setNewPassword: (password: string) => Promise<boolean>;
}) {

  const [state, setState] = useState<'loading' | 'error' | 'success' | 'idle'>('idle');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');

  const passwordIsValid = password === retypePassword && password !== '';

  const doSetNewPassword = async () => {
    setState('loading');
    const resetResult = await setNewPassword(password);
    if (resetResult) {
      setState('success');
    } else {
      setState('error');
    }
  };

  return (
    <div className="">
      {state === 'success' ? (
        <div className="my-2">
          <p>{t('Your password has been changed successfully')}</p>
          <div className="flex flex-row-reverse">
            <ActionLink href={loginHref(returnUrl)}>{t('Login')}</ActionLink>
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
        <form onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          doSetNewPassword();
        }}>
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
            userInputs={[]}
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
            <ActionLink type="secondary" href={loginHref(returnUrl)}>
              {t('Cancel')}
            </ActionLink>
          </div>
        </form>
      )}
    </div>
  );
}

export default ShamirAccountRecovery;
