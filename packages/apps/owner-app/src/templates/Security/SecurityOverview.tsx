import {t, LoadingBlock, Label} from '@homebase-id/common-app';
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

    console.log(info)
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
                                <div className="space-y-4">
                                    {/* Recovery Email */}
                                    <RecoveryEmailRow info={info}/>

                                    {/* Password Status */}
                                    <div className="flex flex-row flex-wrap items-center">
                                        <div className="flex items-center">
                                            <p>{t('Password last verified:')}</p>
                                            <TimeAgoUtc className="ml-2 text-sm font-medium" value={info?.status?.passwordLastVerified ?? 0}/>
                                        </div>
                                        <Link to={""} className="ml-3 underline" onClick={() => setOpenDialog('verify-password')}>
                                            Verify now
                                        </Link>
                                    </div>

                                    {/* Recovery Phrase */}
                                    <div className="flex flex-row flex-wrap items-center">
                                        <div className="flex items-center">
                                            <p>{t('Recovery phrase last verified:')}</p>
                                            <TimeAgoUtc className="ml-2 text-sm font-medium"
                                                        value={info?.status?.recoveryKeyLastVerified ?? 0}/>
                                        </div>
                                        <Link to={""} className="ml-3 underline" onClick={() => setOpenDialog('verify-recovery-phrase')}>
                                            Verify now
                                        </Link>
                                    </div>

                                    {/* Password Recovery */}
                                    <div>
                                        <p className="">{t("Trusted Friends Recovery Status")}</p>
                                        {!info?.isConfigured &&
                                            <div className="mt-1">
                                                {/*<span className="mr-3">💀 Recovery not possible.</span>*/}
                                                <Link className="underline" to="/owner/security/password-recovery">
                                                    Setup Now
                                                </Link>
                                            </div>

                                        }

                                        {info?.recoveryRisk && (
                                            <div className="p-2 mt-2 space-y-2">

                                                <div className="flex flex-row">
                                                    <Label>{t('Last Updated:')}</Label>
                                                    <TimeAgoUtc className="ml-2" value={info.recoveryRisk.healthLastChecked ?? 0}/>
                                                </div>

                                                <DealerRecoveryRiskHeadline report={info.recoveryRisk}/>
                                            </div>
                                        )}
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

            <ChangeRecoveryEmailDialog title={t('Change Recovery Email')}
                                       isOpen={openDialog === 'change-email' || openDialog === 'verify-email'}
                                       verifyOnly={openDialog === 'verify-email'}
                                       defaultEmail={info?.email ?? ""}
                                       onConfirm={handleConfirmDialog}
                                       onCancel={() => setOpenDialog('none')}/>

            <VerifyPasswordDialog title={t('Verify Password')}
                                  isOpen={openDialog === 'verify-password'}
                                  onConfirm={handleConfirmDialog}
                                  onCancel={() => setOpenDialog('none')}/>


            <VerifyRecoveryKeyDialog title={t('Verify Recovery Phrase')}
                                     isOpen={openDialog === 'verify-recovery-phrase'}
                                     onConfirm={handleConfirmDialog}
                                     onCancel={() => setOpenDialog('none')}/>


        </>
    );


    function RecoveryEmailRow({info}: { info?: RecoveryInfo | null; }) {
        const isVerified = !!info?.emailLastVerified;

        return (
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center">
                    <p className="font-medium">{t("Recovery Email:")}</p>
                    <span className="ml-2 text-zinc-700">{info?.email}</span>

                    {isVerified ? (
                        <span className="ml-2 flex items-center text-green-600 text-sm">
            <Check className="h-5 w-5 mr-1" aria-hidden="true"/>
                            {t("Verified")}
                            <TimeAgoUtc
                                className="ml-1 text-sm font-medium"
                                value={info?.emailLastVerified ?? 0}
                            />
          </span>
                    ) : (
                        <span className="ml-2 flex items-center text-red-600 text-sm">
            <Exclamation className="h-5 w-5 mr-1" aria-hidden="true"/>
                            {t("Not Verified")}
                            <button
                                type="button"
                                onClick={() => setOpenDialog("verify-email")}
                                className="ml-2 underline text-blue-600 hover:text-blue-800"
                            >
              {t("Verify")}
            </button>
          </span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setOpenDialog("change-email")}
                    className="ml-3 underline text-blue-600 hover:text-blue-800"
                >
                    {t("Change")}
                </button>
            </div>
        );
    }


}


