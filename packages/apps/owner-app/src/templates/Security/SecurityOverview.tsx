import {t, ActionButton, LoadingBlock} from '@homebase-id/common-app';
import Section from '../../components/ui/Sections/Section';
import {Link} from "react-router-dom";
import {useEffect, useState} from "react";
import {VerifyPasswordDialog} from "./Tab/VerifyPasswordDialog";
import {VerifyRecoveryKeyDialog} from "./Tab/VerifyRecoveryKeyDialog";
import {getVerificationStatus, VerificationStatus} from "../../provider/auth/SecurityHealthProvider";
import {TimeAgoUtc} from "../../components/ui/Date/TimeAgoUtc";

export const SecurityOverview = () => {

  const [openDialog, setOpenDialog] = useState<'none' | 'verify-password' | 'verify-recovery-phrase'>('none');
  const [statusLoading, setStatusLoading] = useState(false);
  const [status, setStatus] = useState<VerificationStatus | null>();

  const reset = async () => {
    setStatusLoading(true)
    const status = await getVerificationStatus();
    setStatus(status);
    setStatusLoading(false);
  }

  useEffect(() => {
    reset();
  }, []);

  const handleConfirmDialog = async () => {
    setOpenDialog('none');
    await reset();
  }

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
                </>
              ) : (
                <div className="space-y-4">
                  {/* Password Status */}
                  <div className="flex flex-row flex-wrap items-center">
                    <div className="flex items-center">
                      <p>{t('Password last verified:')}</p>
                      <TimeAgoUtc className="ml-2 text-sm font-medium" value={status?.passwordLastVerified ?? 0}/>
                    </div>
                    <Link to={""} className="ml-3 underline" onClick={() => setOpenDialog('verify-password')}>
                      Verify now
                    </Link>
                  </div>

                  {/* Recovery Phrase */}
                  <div className="flex flex-row flex-wrap items-center">
                    <div className="flex items-center">
                      <p>{t('Recovery phrase last verified:')}</p>
                      <TimeAgoUtc className="ml-2 text-sm font-medium" value={status?.recoveryKeyLastVerified ?? 0}/>
                    </div>
                    <Link to={""} className="ml-3 underline" onClick={() => setOpenDialog('verify-recovery-phrase')}>
                      Verify now
                    </Link>
                  </div>

                  {/* Password Recovery */}
                  <div className="flex flex-row flex-wrap items-center">
                    <div className="flex items-center">
                      <p>{t('Password recovery last verified:')}</p>
                      <p className="ml-2 text-sm font-medium">{t('7mo ago')}</p>
                    </div>
                    <ActionButton className="ml-auto">{t('Manage Password Recovery → C1')}</ActionButton>
                  </div>
                </div>
              )}
          </>

        </Section>

        <Section
          title={
            <div className="flex flex-col">
              {t('Login history')}
              <small className="text-sm text-gray-400">
                {t('Logins across apps')}
              </small>
            </div>
          }>
          <div></div>
        </Section>
      </>

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
