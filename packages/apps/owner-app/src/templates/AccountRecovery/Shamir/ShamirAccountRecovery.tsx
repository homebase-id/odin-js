import {useEffect, useState} from 'react';
import {Helmet} from 'react-helmet-async';
import {ActionButton, ActionLink, Alert, DomainHighlighter, t} from '@homebase-id/common-app';
import {MinimalLayout} from '../../../components/ui/Layout/Layout';
import UrlNotifier from '../../../components/ui/Layout/UrlNotifier/UrlNotifier';
import {Arrow} from "@homebase-id/common-app/icons";
import {useLocation} from "react-router-dom";
import {exitRecoveryMode, getRecoveryStatus, initiateRecoveryMode, ShamirRecoveryStatusRedacted} from "../../../provider/auth/ShamirRecoveryProvider";

const ShamirAccountRecovery = () => {
    const [state, setState] = useState<'loading' | 'error' | 'success' | 'idle'>('idle');

    const location = useLocation();
    const params = new URLSearchParams(location.search);

    // const [state, setState] = useState<'loading' | 'error' | 'success' | 'idle'>('idle');
    const [status, setStatus] = useState<ShamirRecoveryStatusRedacted | null>(null);
    const [loaded, setLoaded] = useState<boolean>(false);

    const startRecoveryMode = async () => {
        await initiateRecoveryMode();
        await reloadStatus();
    }

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

    useEffect(() => {
        reloadStatus();
    }, []);

    // see if we came here from recovery mode
    const fromVerification = params.get("fv") === "1";
    const recoveryState = status?.state ?? "None";

    if (fromVerification && !loaded) {
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
                                        {t('We notified your delegates/shard holders that you are in recovery mode.')}

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
