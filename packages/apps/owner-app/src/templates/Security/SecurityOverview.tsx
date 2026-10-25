import { t, LoadingBlock } from '@homebase-id/common-app';
import Section from '../../components/ui/Sections/Section';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { VerifyPasswordDialog } from './Dialog/VerifyPasswordDialog';
import { VerifyRecoveryKeyDialog } from './Dialog/VerifyRecoveryKeyDialog';
import {
  getMonthlyReportSetting,
  getRecoveryInfo,
  RecoveryInfo,
  updateMonthlyReportSetting,
} from '../../provider/auth/SecurityHealthProvider';
import { TimeAgoUtc } from '../../components/ui/Date/TimeAgoUtc';
import { ChangeRecoveryEmailDialog } from './Dialog/ChangeRecoveryEmailDialog';
import { DealerRecoveryRiskHeadline } from './DealerRecoveryRiskHeadline';
import { Check, Exclamation } from '@homebase-id/common-app/icons';
import { SettingsRow } from './SettingsRow';

export const SecurityOverview = () => {
  const [openDialog, setOpenDialog] = useState<
    'none' | 'verify-password' | 'verify-recovery-phrase' | 'change-email' | 'verify-email'
  >('none');
  const [statusLoading, setStatusLoading] = useState(false);
  const [info, setInfo] = useState<RecoveryInfo | null>();
  const [monthlyStatusReportEnabled, setMonthlyStatusReportEnabled] = useState(false);

  const reset = async () => {
    setStatusLoading(true);
    const status = await getRecoveryInfo();
    setInfo(status);

    const reportEnabled = await getMonthlyReportSetting();
    setMonthlyStatusReportEnabled(reportEnabled);
    setStatusLoading(false);
  };

  useEffect(() => {
    reset();
  }, []);

  const handleConfirmDialog = async () => {
    setOpenDialog('none');
    await reset();
  };

  const disableMonthlyReport = async () => {
    setStatusLoading(true);
    await updateMonthlyReportSetting(false);
    setMonthlyStatusReportEnabled(false);
    setStatusLoading(false);
  };

  const enableMonthlyReport = async () => {
    setStatusLoading(true);
    await updateMonthlyReportSetting(true);
    setMonthlyStatusReportEnabled(true);
    setStatusLoading(false);
  };

  return (
    <>
      {/*<ErrorNotification error={updateFlagError}/>*/}

      <>
        <Section
          title={
            <div className="flex flex-col">
              {t('Account Recovery Health')}
              <small className="text-sm text-gray-400">{t('')}</small>
            </div>
          }
        >
          <>
            {statusLoading ? (
              <>
                <LoadingBlock className="m-4 h-10" />
                <LoadingBlock className="m-4 h-10" />
                <LoadingBlock className="m-4 h-10" />
                <LoadingBlock className="m-4 h-10" />
              </>
            ) : (
              <div className="space-y-6">
                {/* Recovery Email */}
                <RecoveryEmailRow info={info} />

                {/* Password Status */}
                <SettingsRow label={t('Password last verified:')}>
                  {(info?.status?.passwordLastVerified ?? 0) > 0 && (
                    <div className="flex text-green-600">
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      {t('Verified')}
                      <TimeAgoUtc
                        className="ml-2 font-medium text-green-600"
                        value={info?.status?.passwordLastVerified ?? 0}
                      />
                    </div>
                  )}

                  <Link
                    to=""
                    onClick={() => setOpenDialog('verify-password')}
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    {t('Verify now')}
                  </Link>
                </SettingsRow>

                {/* Password Recovery */}
                <SettingsRow label={t('Password Recovery:')}>
                  {!info?.isConfigured && (
                    <span className="flex items-center text-red-600">
                      <Exclamation className="mr-1 h-4 w-4" />
                      {t('Not Verified')}
                      <Link
                        to="/owner/security/password-recovery?gs=1"
                        className="ml-2 text-blue-600 underline hover:text-blue-800"
                      >
                        {t('Setup now')}
                      </Link>
                    </span>
                  )}

                  {info?.isConfigured && info?.recoveryRisk && (
                    <DealerRecoveryRiskHeadline report={info.recoveryRisk} />
                  )}
                </SettingsRow>

                <SettingsRow label={t('Email monthly security health report:')}>
                  {monthlyStatusReportEnabled ? (
                    <>
                      <div className="flex items-center text-green-600">
                        <Check className="mr-2 h-4 w-4" />
                        {t('Enabled')}
                      </div>

                      <Link
                        to=""
                        onClick={disableMonthlyReport}
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {t('Disable now')}
                      </Link>
                    </>
                  ) : (
                    <>
                      <span className="text-zinc-600">{t('Not Enabled')}</span>

                      <Link
                        to=""
                        onClick={enableMonthlyReport}
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {t('Enable now')}
                      </Link>
                    </>
                  )}
                </SettingsRow>

                {/* Recovery Phrase Section */}
                {info?.hasRecoveryKeyBeenViewed ? (
                  <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                    <SettingsRow label={t('Recovery phrase last verified:')}>
                      {(info?.status?.recoveryKeyLastVerified ?? 0) > 0 ? (
                        <div className="flex items-center text-green-600">
                          <Check className="mr-2 h-4 w-4" />
                          {t('Verified')}
                          <TimeAgoUtc
                            className="ml-2 font-medium text-green-600"
                            value={info?.status?.recoveryKeyLastVerified ?? 0}
                          />
                        </div>
                      ) : (
                        <span className="text-zinc-600">{t('Not verified yet')}</span>
                      )}

                      <Link
                        to=""
                        onClick={() => setOpenDialog('verify-recovery-phrase')}
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {t('Verify now')}
                      </Link>
                    </SettingsRow>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-gray-700">
                    <p className="font-medium">
                      {t("You haven't stored your recovery phrase yet.")}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {t(
                        'For account recovery, please view and store your recovery phrase in a safe place.'
                      )}
                    </p>
                    <Link
                      to="/owner/security/password-recovery?rp=1"
                      className="mt-2 inline-block text-blue-600 underline hover:text-blue-800"
                    >
                      {t('Go store your recovery phrase now')}
                    </Link>
                  </div>
                )}
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

      {info && (
        <ChangeRecoveryEmailDialog
          title={t('Change Recovery Email')}
          info={info}
          isOpen={openDialog === 'change-email' || openDialog === 'verify-email'}
          verifyOnly={openDialog === 'verify-email'}
          onConfirm={handleConfirmDialog}
          onCancel={() => setOpenDialog('none')}
        />
      )}

      <VerifyPasswordDialog
        title={t('Verify Password')}
        isOpen={openDialog === 'verify-password'}
        onConfirm={handleConfirmDialog}
        onCancel={() => setOpenDialog('none')}
      />

      <VerifyRecoveryKeyDialog
        title={t('Verify Recovery Phrase')}
        isOpen={openDialog === 'verify-recovery-phrase'}
        onConfirm={handleConfirmDialog}
        onCancel={() => setOpenDialog('none')}
        showHint={true}
      />
    </>
  );

  function RecoveryEmailRow({ info }: { info?: RecoveryInfo | null }) {
    const isVerified = !!info?.emailLastVerified;
    const hasEmail = !!info?.email;

    return (
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-start sm:gap-3">
        {/* Left side: label, email, verification */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <p className="font-medium">{t('Recovery Email:')}</p>

          {info?.email && <span className="break-all text-zinc-700">{info.email}</span>}

          {isVerified ? (
            <span className="flex items-center text-sm text-green-600">
              <Check className="mr-1 h-4 w-4" aria-hidden="true" />
              {t('Verified')}
              <TimeAgoUtc
                className="ml-1 text-sm font-medium"
                value={info?.emailLastVerified ?? 0}
              />
            </span>
          ) : (
            hasEmail && (
              <span className="flex items-center text-red-600">
                <Exclamation className="mr-1 h-4 w-4" aria-hidden="true" />
                {t('Not Verified')}
                <button
                  type="button"
                  onClick={() => setOpenDialog('verify-email')}
                  className="ml-2 text-blue-600 underline hover:text-blue-800"
                >
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
          className="self-start whitespace-nowrap text-blue-600 underline hover:text-blue-800 sm:self-auto sm:text-base"
        >
          {t('Change')}
        </button>
      </div>
    );
  }
};
