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
                    <TimeAgoUtc className="text-sm font-medium" value={info?.status?.passwordLastVerified ?? 0}/>
                    <Link
                      to=""
                      onClick={() => setOpenDialog('verify-password')}
                      className="underline text-blue-600 hover:text-blue-800"
                    >
                      {t('Verify now')}
                    </Link>
                  </div>

                  {/* Recovery Phrase */}
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2">
                    <p className="font-medium">{t('Recovery phrase last verified:')}</p>
                    <TimeAgoUtc className="text-sm font-medium" value={info?.status?.recoveryKeyLastVerified ?? 0}/>
                    <Link
                      to=""
                      onClick={() => setOpenDialog('verify-recovery-phrase')}
                      className="underline text-blue-600 hover:text-blue-800"
                    >
                      {t('Verify now')}
                    </Link>
                  </div>

                  {/* Password Recovery */}
                  <div>
                    <span className="font-medium">{t('Trusted Connections Recovery Status')}</span>

                    {!info?.isConfigured && (
                      <span className="ml-2">
                        <Link
                          to="/owner/security/password-recovery?gs=1"
                          className="underline text-blue-600 hover:text-blue-800"
                        >
                          {t('Setup Now')}
                        </Link>
                      </span>
                    )}

                    {info?.recoveryRisk && (
                      <div className="p-3 mt-3 border rounded-lg bg-gray-50 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                          <Label>{t('Last Updated:')}</Label>
                          <TimeAgoUtc className="text-sm" value={info.recoveryRisk.healthLastChecked ?? 0}/>
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

  function RecoveryEmailRow({ info }: { info?: RecoveryInfo | null }) {
    const isVerified = !!info?.emailLastVerified;
    const hasEmail = !!info?.email;

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
        {/* Left side: label, email, verification */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <p className="font-medium">{t('Recovery Email:')}</p>

          {info?.email && <span className="text-zinc-700 break-all">{info.email}</span>}

          {isVerified ? (
            <span className="flex items-center text-green-600 text-sm">
            <Check className="h-4 w-4 mr-1" aria-hidden="true" />
              {t('Verified')}
              <TimeAgoUtc
                className="ml-1 text-sm font-medium"
                value={info?.emailLastVerified ?? 0}
              />
          </span>
          ) : (
            hasEmail && (
              <span className="flex items-center text-red-600 text-sm">
              <Exclamation className="h-4 w-4 mr-1" aria-hidden="true" />
                {t('Not Verified')}
                <button
                  type="button"
                  onClick={() => setOpenDialog('verify-email')}
                  className="ml-2 underline text-blue-600 hover:text-blue-800"
                >
                {t('Verify')}
              </button>
            </span>
            )
          )}
        </div>

        {/* Right side: Change button */}
        <button
          type="button"
          onClick={() => setOpenDialog('change-email')}
          className="underline text-blue-600 hover:text-blue-800 text-sm sm:text-base whitespace-nowrap self-start sm:self-auto"
        >
          {t('Change')}
        </button>
      </div>
    );
  }


}


