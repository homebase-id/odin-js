import {useEffect, useRef, useState} from 'react';
import {Helmet} from 'react-helmet-async';
import {ActionButton, ActionLink, Alert, DomainHighlighter, Label, t} from '@homebase-id/common-app';
import {MinimalLayout} from '../../../components/ui/Layout/Layout';
import UrlNotifier from '../../../components/ui/Layout/UrlNotifier/UrlNotifier';
import {Arrow} from "@homebase-id/common-app/icons";
import {useLocation, useNavigate} from "react-router-dom";
import {ApiType} from '@homebase-id/js-lib/core';
import {BundleRecovery, RecoverySlot} from '@homebase-id/js-lib/auth';
import {OwnerClient} from '@homebase-id/common-app';
import {
  enterRecoveryMode,
  exitRecoveryMode,
  fillSlot,
  finalizeRecovery,
  forgetRecoveryKey,
  getRecoveryStatusForThisBrowser,
  initiateRecoveryMode,
  openSlots,
  recoverInThisBrowser,
  recoveryUnderWayElsewhereMessage,
  ShamirRecoveryState,
  ShamirRecoveryStatusRedacted,
} from "../../../provider/auth/SecurityRecoveryProvider";
import {resetPasswordWithResetKey} from "../../../provider/auth/ZeroKnowledgeProvider";
import {PasswordInput} from "../../../components/Password/PasswordInput";
import {PasswordStrength} from "../../../components/Password/PasswordStrength";
import {RETURN_URL_PARAM} from "../../../hooks/auth/useAuth";
import {RecoveredPassword, loginHref} from "../RecoveredPassword";

interface Message {
  text: string;
  /** Null: not known yet (the status couldn't be read); the next good read settles it. */
  forState: ShamirRecoveryState | null;
}

const ShamirAccountRecovery = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const returnUrl = params.get(RETURN_URL_PARAM);
  const enterNonceId = params.get("enter");
  const entering = useRef(false);
  // An automatic holder's email link: its shard and code
  const fillShardId = params.get("fill");
  const fillCode = params.get("code");
  const filling = useRef(false);

  const [status, setStatus] = useState<ShamirRecoveryStatusRedacted | null>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  // A message belongs to the recovery state it was shown in: another state hides it
  const [error, setError] = useState<Message | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<Message | null>(null);
  const stateRef = useRef<ShamirRecoveryState>(ShamirRecoveryState.None);
  // `forState`: the state the message is for (null: not known yet); the current one by default
  const setErrorMessage = (text: string | null, forState: ShamirRecoveryState | null = stateRef.current) =>
    setError(text ? {text, forState} : null);
  const setNotice = (text: string | null, forState: ShamirRecoveryState | null = stateRef.current) =>
    setNoticeMessage(text ? {text, forState} : null);
  // Status reads can come back out of order (the poll, a link's own read): only the newest counts
  const lastRead = useRef(0);
  const [thisBrowser, setThisBrowser] = useState<boolean>(false);
  // A recovery under way for another browser's key
  const [elsewhere, setElsewhere] = useState<boolean>(false);
  // The holders and which are in, when this browser started the recovery
  const [slots, setSlots] = useState<RecoverySlot[] | null>(null);
  // A reset with the friends' reset key ends recovery (state None): the page keeps saying it worked
  const [passwordReset, setPasswordReset] = useState<boolean>(false);

  // see if we came here from recovery mode
  const fromVerification = params.get("fv") === "1";
  const recoveryState = status?.state ?? ShamirRecoveryState.None;
  stateRef.current = recoveryState;
  const shown = (m: Message | null) =>
    m && (m.forState === null || m.forState === recoveryState) ? m.text : null;
  const errorMessage = shown(error);
  const notice = shown(noticeMessage);

  /** `sentNotice`: what to say once the email is on its way, if anything. */
  const startRecoveryMode = async (sentNotice?: string) => {
    try {
      setErrorMessage(null); // clear previous
      setNotice(null);
      if (!(await initiateRecoveryMode())) {
        setErrorMessage(t('The email could not be sent. Try again.'));
      } else if (sentNotice) {
        setNotice(sentNotice);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setErrorMessage(error.message ? t(error.message) : t("An unexpected error occurred."));
    }
    await reloadStatus();
  };

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

  /**
   * The state read and whether this browser started the recovery, or null when the read failed: that
   * is no news about the recovery, so nothing changes. A message from another state goes; one not yet
   * pinned to a state is pinned to this one.
   */
  const reloadStatus = () => {
    const read = ++lastRead.current;
    return getRecoveryStatusForThisBrowser().then(({status: result, thisBrowser: isThisBrowser, elsewhere: isElsewhere}) => {
      setLoaded(true);
      if (!result || read !== lastRead.current) return null;
      const settle = (m: Message | null) =>
        !m ? null : m.forState === null ? {...m, forState: result.state} : m.forState === result.state ? m : null;
      setError(settle);
      setNoticeMessage(settle);
      setStatus(result);
      setThisBrowser(isThisBrowser);
      setElsewhere(isElsewhere);
      openSlots(isThisBrowser ? result : null).then(setSlots);
      return {state: result.state, thisBrowser: isThisBrowser};
    });
  };

  // The email link lands here: this browser posts its nonce back with its throwaway key
  useEffect(() => {
    if (!enterNonceId || entering.current) return;
    entering.current = true;
    enterRecoveryMode(enterNonceId).then(async (enterError) => {
      navigate(location.pathname, {replace: true});
      // The message belongs to the state the link leads to, read after it
      // Not read: the next good read pins it
      const read = await reloadStatus().catch(() => null);
      if (enterError) setErrorMessage(t(enterError), read?.state ?? null);
    });
  }, [enterNonceId]);

  // A holder's email link lands here, on any device: its piece is sealed to the browser that started
  useEffect(() => {
    if (!fillShardId || !fillCode || filling.current) return;
    filling.current = true;
    fillSlot(fillShardId, fillCode).then(async (fillError) => {
      navigate(location.pathname, {replace: true});
      // The message belongs to the state the click leads to: the one that fills the last slot moves it
      // Not read: the next good read pins it
      const read = await reloadStatus().catch(() => null);
      if (fillError) {
        setErrorMessage(t(fillError), read?.state ?? null);
      } else {
        setNotice(!read
          ? t('This piece is in. If you started recovery in another browser, finish there.')
          : read.thisBrowser
            ? t('This piece is in.')
            : t('This piece is in. Finish in the browser where you started recovery.'), read?.state ?? null);
      }
    });
  }, [fillShardId, fillCode]);

  useEffect(() => {
    // run immediately on mount
    reloadStatus();

    // then run every 10 seconds
    const intervalId = setInterval(() => {
      reloadStatus();
    }, 5 * 1000);

    return () => clearInterval(intervalId); // cleanup on unmount
  }, []);

  if ((fromVerification || enterNonceId || fillShardId) && !loaded) {
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
                  {t('We asked everyone who holds a piece of your recovery. Friends who must approve do so in their ' +
                    'Homebase; the others each email you a link to click. Forget who they were? Check the email we ' +
                    'sent when you started.')}

                  <Alert type="warning" isCompact={false} className="mt-3">
                    {status?.needed
                      ? `${t('Pieces in')}: ${status.filled ?? 0} / ${status.needed}`
                      : t('We are waiting for enough pieces to come in')}
                  </Alert>

                  {slots && <Slots slots={slots}/>}

                  <hr className="mb-5 mt-7 dark:border-slate-700"/>

                  {elsewhere && (
                    <p className="mt-3 text-slate-400">
                      {t(recoveryUnderWayElsewhereMessage())}
                    </p>
                  )}

                  <div className="flex flex-row-reverse justify-between">
                    {!elsewhere && (
                      <ActionButton className="mt-3 mb-3"
                                    onClick={() => startRecoveryMode(t('Check your email: the link asks everyone who holds a piece again.'))}>
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
                <RecoveryReady
                  returnUrl={returnUrl}
                  thisBrowser={thisBrowser}
                  onCancel={() => cancelRecoveryMode()}
                  onPasswordReset={() => setPasswordReset(true)}
                />
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


/** Who holds a piece, and which are in: shown only in the browser that started. */
function Slots({slots}: { slots: RecoverySlot[] }) {
  return (
    <ul className="mt-3">
      {slots.map((slot) => (
        <li key={slot.player.odinId} className="flex flex-row justify-between py-1">
          <span>{slot.player.odinId}</span>
          <span className={slot.filled ? 'text-green-600' : 'text-slate-400'}>
            {slot.filled
              ? t('In')
              : slot.player.type === 'automatic'
                ? t('Click the link in its email')
                : t('Ask them to approve')}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Once enough shards are in: this browser opens them, rebuilds the secret and shows the password,
 * as recovery with the phrase does; or, with no password copy or one that doesn't log in, sets a new
 * password with the deal's reset key. A server-made deal gives back only its secret, which sets a new
 * password; the data only this browser could open is lost with the old one.
 */
function RecoveryReady({returnUrl, thisBrowser, onCancel, onPasswordReset}: {
  returnUrl: string | null;
  thisBrowser: boolean;
  onCancel: () => void;
  onPasswordReset: () => void;
}) {
  const [recovered, setRecovered] = useState<BundleRecovery>();
  const [resetting, setResetting] = useState(false);
  const [state, setState] = useState<'loading' | 'error' | 'idle'>('idle');

  // Only the browser whose key the holders sealed to can open their shards
  if (!recovered && !thisBrowser) {
    return (
      <div className="my-2">
        <p>{t('Enough pieces of your recovery are in, but this is not the browser where you started recovery. Open this page there.')}</p>
        <div className="mt-5 flex flex-row-reverse">
          <ActionButton type="secondary" onClick={onCancel}>{t('Exit recovery mode')}</ActionButton>
        </div>
      </div>
    );
  }

  const open = async () => {
    setState('loading');
    try {
      const result = await recoverInThisBrowser();
      setRecovered(result);
      setResetting(result.serverMade || result.recovery.password === undefined);
      setState('idle');
    } catch (error) {
      console.error(error);
      setState('error');
    }
  };

  if (!recovered) {
    return (
      <div className="my-2">
        <p>{t('🎉 Enough pieces of your recovery are in.')}</p>
        {state === 'error' && (
          <Alert type="warning" isCompact={true} className="mt-3">
            {t('The pieces did not open your account. Exit recovery mode and start again.')}
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

  if (recovered.serverMade) {
    return (
      <>
        <p className="mb-2 max-w-md text-slate-400">
          {t('Your recovery was set up before your password could be saved with it. Set a new password. ' +
            'Data that only your browser could open stays locked with the old password.')}
        </p>
        <PasswordReset
          returnUrl={returnUrl}
          setNewPassword={async (password) => {
            const done = await finalizeRecovery(recovered.secret, password);
            if (done) {
              forgetRecoveryKey();
              onPasswordReset();
            }
            return done;
          }}
        />
      </>
    );
  }

  const recovery = recovered.recovery;
  if (resetting) {
    return (
      <>
        <p className="mb-2 max-w-md text-slate-400">
          {recovery.password === undefined
            ? t('Your account opened, but no password was saved with it. Set a new password.')
            : t('Set a new password with your recovery.')}
        </p>
        <PasswordReset
          returnUrl={returnUrl}
          setNewPassword={async (password) => {
            const done = await resetPasswordWithResetKey(new OwnerClient({api: ApiType.Owner}), recovery, password);
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
      password={recovery.password}
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
