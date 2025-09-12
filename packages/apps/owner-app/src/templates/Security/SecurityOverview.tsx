import {t, LoadingBlock} from '@homebase-id/common-app';
import Section from '../../components/ui/Sections/Section';
import {Link} from "react-router-dom";
import {useEffect, useState} from "react";
import {VerifyPasswordDialog} from "./Dialog/VerifyPasswordDialog";
import {VerifyRecoveryKeyDialog} from "./Dialog/VerifyRecoveryKeyDialog";
import {getRecoveryInfo, RecoveryInfo} from "../../provider/auth/SecurityHealthProvider";
import {TimeAgoUtc} from "../../components/ui/Date/TimeAgoUtc";
import {ChangeRecoveryEmailDialog} from "./Dialog/ChangeRecoveryEmailDialog";
import {Sad, Happy} from "@homebase-id/common-app/icons";
import {DealerRecoveryRiskOverview} from "./DealerRecoveryRiskOverview";

export const SecurityOverview = () => {

    const [openDialog, setOpenDialog] = useState<'none' | 'verify-password' | 'verify-recovery-phrase' | 'change-email'>('none');
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
    // const recoverable = info?.recoveryRisk?.isRecoverable;
    console.log('rr', info?.recoveryRisk)
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
                                    <div className="flex flex-row flex-wrap items-center">
                                        <div className="flex items-center">
                                            <p>{t('Recovery Email:')}</p>
                                            {info?.email}
                                        </div>
                                        <Link to={""} className="ml-3 underline" onClick={() => setOpenDialog('change-email')}>
                                            Change
                                        </Link>
                                    </div>

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
                                            <TimeAgoUtc className="ml-2 text-sm font-medium" value={info?.status?.recoveryKeyLastVerified ?? 0}/>
                                        </div>
                                        <Link to={""} className="ml-3 underline" onClick={() => setOpenDialog('verify-recovery-phrase')}>
                                            Verify now
                                        </Link>
                                    </div>

                                    {/* Password Recovery */}
                                    <div className="flex flex-row flex-wrap items-center">
                                        <div className="flex items-center">
                                            <p>{t("Password recovery last verified:")}</p>

                                            {info?.recoveryRisk &&
                                                <>
                                                    <TimeAgoUtc
                                                        className="ml-2 text-sm font-medium"
                                                        value={info?.recoveryRisk.healthLastChecked ?? 0}
                                                    />
                                                    <span className="ml-3"><DealerRecoveryRiskOverview report={info.recoveryRisk}/></span>
                                                </>
                                            }
                                            {/*{recoverable ? (*/}
                                            {/*    <Happy className="ml-2 h-5 w-5 text-green-500"/>*/}
                                            {/*) : (*/}
                                            {/*    <Sad className="ml-2 h-5 w-5 text-red-500"/>*/}
                                            {/*)}*/}
                                        </div>

                                        <Link to="/owner/security/password-recovery" className="ml-3 underline">
                                            Manage now
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

            <ChangeRecoveryEmailDialog title={t('Change Recovery Email')}
                                       isOpen={openDialog === 'change-email'}
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
};
