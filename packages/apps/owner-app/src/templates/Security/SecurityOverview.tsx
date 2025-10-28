import {t, LoadingBlock} from '@homebase-id/common-app';
import Section from '../../components/ui/Sections/Section';
import {Link} from "react-router-dom";
import {useEffect, useState} from "react";
import {VerifyPasswordDialog} from "./Dialog/VerifyPasswordDialog";
import {VerifyRecoveryKeyDialog} from "./Dialog/VerifyRecoveryKeyDialog";
import {getRecoveryInfo, RecoveryInfo} from "../../provider/auth/SecurityHealthProvider";
import {TimeAgoUtc} from "../../components/ui/Date/TimeAgoUtc";
import {ChangeRecoveryEmailDialog} from "./Dialog/ChangeRecoveryEmailDialog";
import {DealerRecoveryRiskHeadline} from "./DealerRecoveryRiskHeadline";
import {Check, Exclamation} from "@homebase-id/common-app/icons";

export const SecurityOverview = () => {

    const [openDialog, setOpenDialog] = useState<'none' | 'verify-password' | 'verify-recovery-phrase' | 'change-email' | 'verify-email'>('none');
    const [statusLoading, setStatusLoading] = useState(false);
    const [info, setInfo] = useState<RecoveryInfo | null>();

    const reset = async () => {
        setStatusLoading(true)
        const status = await getRecoveryInfo();
        setInfo(status);
        setStatusLoading(false);
    }

    useEffect(() => {
        reset();
    }, []);

    const handleConfirmDialog = async () => {
        setOpenDialog('none');
        await reset();
    }

    // console.log(info)
    // console.log(openDialog)
    return (
        <>
            {/*<ErrorNotification error={updateFlagError}/>*/}

            <>
                <Section
                    title={
                        <div className="flex flex-col">
                            {t('Account Recovery Health')}
                            <small className="text-sm text-gray-400">
                                {t('')}
                            </small>
                        </div>
                    }>
                    <>
                        {
                            statusLoading ? (
                                <>
                                    <LoadingBlock className="m-4 h-10"/>
                                    <LoadingBlock className="m-4 h-10"/>
                                    <LoadingBlock className="m-4 h-10"/>
                                    <LoadingBlock className="m-4 h-10"/>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    {/* Recovery Email */}
                                    <RecoveryEmailRow info={info}/>

                                    {/* Password Status */}
                                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2">
                                        <p className="font-medium">{t('Password last verified:')}</p>
                                        {(info?.status?.passwordLastVerified ?? 0) > 0 &&
                                            <div className="flex text-green-600">
                                                <Check className="text-green-600 h-4 w-4 mr-2" aria-hidden="true"/>
                                                {t('Verified')}
                                                <TimeAgoUtc className="ml-2 text-green-600 font-medium" value={info?.status?.passwordLastVerified ?? 0}/>
                                            </div>
                                        }
                                        <Link
                                            to=""
                                            onClick={() => setOpenDialog('verify-password')}
                                            className="underline text-blue-600 hover:text-blue-800">
                                            {t('Verify now')}
                                        </Link>
                                    </div>

                                    {/* Password Recovery */}
                                    <div>
                                        <div className="flex items-center">
                                            <p className="font-medium">{t('Password Recovery')}</p>

                                            {!info?.isConfigured && (
                                                <span className="ml-2 flex items-center text-red-600">
                                                      <Exclamation className="h-4 w-4 mr-1 shrink-0" aria-hidden="true"/>
                                                      <span className="flex items-center space-x-1">
                                                        <span className="mr-1">{t('Not Verified')}</span>
                                                        <Link
                                                            to="/owner/security/password-recovery?gs=1"
                                                            className="ml-2 underline text-blue-600 hover:text-blue-800">
                                                          {t('Setup now')}
                                                        </Link>
                                                      </span>
                                                    </span>
                                            )}

                                            {info?.isConfigured && info?.recoveryRisk && (
                                                <DealerRecoveryRiskHeadline report={info.recoveryRisk}/>
                                            )}
                                        </div>

                                    </div>

                                    {/* Recovery Phrase */}
                                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2">
                                        <p className="font-medium">{t('Recovery phrase last verified:')}</p>
                                        {(info?.status?.recoveryKeyLastVerified ?? 0) > 0 &&
                                            <div className="flex text-green-600">
                                                <Check className="text-green-600 h-4 w-4 mr-2" aria-hidden="true"/>
                                                {t('Verified')}
                                                <TimeAgoUtc className="ml-2 text-green-600 font-medium" value={info?.status?.recoveryKeyLastVerified ?? 0}/>
                                            </div>
                                        }

                                        <Link
                                            to=""
                                            onClick={() => setOpenDialog('verify-recovery-phrase')}
                                            className="underline text-blue-600 hover:text-blue-800">
                                            {t('Verify now')}
                                        </Link>
                                    </div>
                                </div>

                            )}
                    </>

                </Section>

                {/*do this later*/}
                {/*<Section*/}
                {/*  title={*/}
                {/*    <div className="flex flex-col">*/}
                {/*      {t('Login history')}*/}
                {/*      <small className="text-sm text-gray-400">*/}
                {/*        {t('Logins across apps')}*/}
                {/*      </small>*/}
                {/*    </div>*/}
                {/*  }>*/}
                {/*  <div></div>*/}
                {/*</Section>*/}
            </>

            {info && <ChangeRecoveryEmailDialog title={t('Change Recovery Email')}
                                                info={info}
                                                isOpen={openDialog === 'change-email' || openDialog === 'verify-email'}
                                                verifyOnly={openDialog === 'verify-email'}
                                                onConfirm={handleConfirmDialog}
                                                onCancel={() => setOpenDialog('none')}/>}

            <VerifyPasswordDialog title={t('Verify Password')}
                                  isOpen={openDialog === 'verify-password'}
                                  onConfirm={handleConfirmDialog}
                                  onCancel={() => setOpenDialog('none')}/>


            <VerifyRecoveryKeyDialog title={t('Verify Recovery Phrase')}
                                     isOpen={openDialog === 'verify-recovery-phrase'}
                                     onConfirm={handleConfirmDialog}
                                     onCancel={() => setOpenDialog('none')}
                                     showHint={true}/>


        </>
    );

    function RecoveryEmailRow({info}: { info?: RecoveryInfo | null }) {
        const isVerified = !!info?.emailLastVerified;
        const hasEmail = !!info?.email;

        return (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-1 sm:gap-3">
                {/* Left side: label, email, verification */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <p className="font-medium">{t('Recovery Email:')}</p>

                    {info?.email && <span className="text-zinc-700 break-all">{info.email}</span>}

                    {isVerified ? (
                        <span className="flex items-center text-green-600 text-sm">
            <Check className="h-4 w-4 mr-1" aria-hidden="true"/>
                            {t('Verified')}
                            <TimeAgoUtc
                                className="ml-1 text-sm font-medium"
                                value={info?.emailLastVerified ?? 0}
                            />
          </span>
                    ) : (
                        hasEmail && (
                            <span className="flex items-center text-red-600">
              <Exclamation className="h-4 w-4 mr-1" aria-hidden="true"/>
                                {t('Not Verified')}
                                <button
                                    type="button"
                                    onClick={() => setOpenDialog('verify-email')}
                                    className="ml-2 underline text-blue-600 hover:text-blue-800">
                {t('Verify now')}
              </button>
            </span>
                        )
                    )}
                </div>
                {/* Right side: Change button */}
                <button
                    type="button"
                    onClick={() => setOpenDialog('change-email')}
                    className="underline text-blue-600 hover:text-blue-800 sm:text-base whitespace-nowrap self-start sm:self-auto"
                >
                    {t('Change')}
                </button>
            </div>
        );
    }


}


