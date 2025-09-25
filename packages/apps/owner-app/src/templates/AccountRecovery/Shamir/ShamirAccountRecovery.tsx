import {useEffect, useState} from 'react';
import {Helmet} from 'react-helmet-async';
import {ActionButton, Alert, DomainHighlighter, t} from '@homebase-id/common-app';
import {MinimalLayout} from '../../../components/ui/Layout/Layout';
import UrlNotifier from '../../../components/ui/Layout/UrlNotifier/UrlNotifier';
import {Arrow} from "@homebase-id/common-app/icons";
import {useLocation, useNavigate} from "react-router-dom";
import {RECOVERY_PATH} from "../../../hooks/auth/useAuth";
import {
  exitRecoveryMode,
  getRecoveryStatus,
  initiateRecoveryMode, ShamirRecoveryStatusRedacted,
} from "../../../provider/auth/SecurityRecoveryProvider";

const ShamirAccountRecovery = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const [status, setStatus] = useState<ShamirRecoveryStatusRedacted | null>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  // see if we came here from recovery mode
  const fromVerification = params.get("fv") === "1";
  const nonceId = params.get("id");
  const token = params.get("token");
  const fromFinalize = nonceId && token;
  const recoveryState = status?.state ?? "None";

  const startRecoveryMode = async () => {
    try {
      setErrorMessage(null); // clear previous
      await initiateRecoveryMode();
      await reloadStatus();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setErrorMessage(error.message || t("An unexpected error occurred."));
    }
  };


  const cancelRecoveryMode = async () => {
    await exitRecoveryMode();
    await reloadStatus();
  }

  const reloadStatus = async () => {
    getRecoveryStatus().then((result) => {
      setStatus(result);
      setLoaded(true);
    });
  };

  const continueToUseRecoveryKey = async () => {
    navigate(`${RECOVERY_PATH}?id=${params.get("id")}&fk=${params.get("token")}`)
  }

  useEffect(() => {
    // run immediately on mount
    reloadStatus();

    // then run every 10 seconds
    const intervalId = setInterval(() => {
      reloadStatus();
    }, 5 * 1000);

    return () => clearInterval(intervalId); // cleanup on unmount
  }, []);


  if ((fromVerification || fromFinalize) && !loaded) {
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
              {recoveryState === 'awaitingOwnerEmailVerificationToEnterRecoveryMode' ? (
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
              ) : recoveryState === 'awaitingSufficientDelegateConfirmation' ? (<>
                  {t('We notified your trusted connections that you are in recovery mode.  Forget who they were?  ' +
                    'Check the email we sent when you entered recovery mode.')}
                  
                  <Alert type="warning" isCompact={false} className="mt-3">
                    {t('We are waiting for a sufficient number of your delegates to confirm')}
                  </Alert>

                  <hr className="mb-5 mt-7 dark:border-slate-700"/>

                  <div className="flex flex-row-reverse justify-between">
                    <ActionButton className="mt-3 mb-3"
                                  onClick={() => startRecoveryMode()}>
                      {t('Start over')}
                      <Arrow className="ml-auto h-5 w-5"/>
                    </ActionButton>

                    <ActionButton
                      type="secondary"
                      className="mt-3 mb-3"
                      onClick={() => cancelRecoveryMode()}>
                      {t('Exit recovery mode')}
                    </ActionButton>
                  </div>
                </>
              ) : recoveryState === 'awaitingOwnerFinalization' ? (<>
                  {t('🎉 You are ready to finalize your password recovery!')}

                  <hr className="mb-5 mt-7 dark:border-slate-700"/>

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

                  {token && nonceId && (
                    <div className="flex flex-row-reverse justify-between">
                      {(!token || !nonceId) && (
                        <div className="my-2">
                          <p>{t('We sent an email including your final recovery link.  Click the link in this email to continue.')}</p>
                          <p className="mt-3">Email: <b>{status?.email}</b></p>
                          <hr className="mb-5 mt-7 dark:border-slate-700"/>
                        </div>
                      )}

                      <ActionButton className="mt-3 mb-3"
                                    onClick={() => continueToUseRecoveryKey()}>
                        {t('Continue to set password')}
                        <Arrow className="ml-auto h-5 w-5"/>
                      </ActionButton>
                      <div className="my-2">
                        <ActionButton
                          type="secondary"
                          className="mt-3 mb-3"
                          onClick={() => cancelRecoveryMode()}>
                          {t('Exit recovery mode')}
                        </ActionButton>
                      </div>
                    </div>
                  )}

                </>
              ) : recoveryState === 'awaitingOwnerEmailVerificationToExitRecoveryMode' ? (
                <div className="my-2">
                  <p>{t('We sent an email to the one you used during signup.  Click the link in this email to continue ' +
                    'exiting recovery mode.')}</p>
                  <p className="mt-3">Email: <b>{status?.email}</b></p>
                  <hr className="mb-5 mt-7 dark:border-slate-700"/>

                  <div className="flex flex-row-reverse">
                    <ActionButton className="mt-3 mb-3"
                                  onClick={() => exitRecoveryMode()}>
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

export default ShamirAccountRecovery;
