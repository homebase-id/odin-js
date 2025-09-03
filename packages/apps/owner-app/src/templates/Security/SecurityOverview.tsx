/* eslint-disable no-fallthrough */
import {t, ActionButton} from '@homebase-id/common-app';
import Section from '../../components/ui/Sections/Section';
import {Link} from "react-router-dom";
import {useEffect, useState} from "react";
import {VerifyPasswordDialog} from "./Tab/VerifyPasswordDialog";
import {VerifyRecoveryKeyDialog} from "./Tab/VerifyRecoveryKeyDialog";

export const SecurityOverview = () => {

  const [openDialog, setOpenDialog] = useState<'none' | 'verify-password' | 'verify-recovery-phrase'>('none');
  const systemSettingsLoading = true;
  const lastVerified = '11mo ago';

  const reset = async () => {
    // get the latest verfication stuff
  }

  useEffect(() => {
    reset();
  }, []);

  const handleConfirmDialog = async () => {
    await reset();
    setOpenDialog('none');
  }

  return (
    <>
      {/*<ErrorNotification error={updateFlagError}/>*/}
      {systemSettingsLoading && (
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

            <div className="space-y-4">
              {/* Password Status */}
              <div className="flex flex-row flex-wrap items-center">
                <div className="flex items-center">
                  <p>{t('Password last verified:')}</p>
                  <p className="ml-2 text-sm font-medium">{lastVerified}</p>
                </div>
                <Link to={""} className="ml-3 underline" onClick={() => setOpenDialog('verify-password')}>
                  Verify now
                </Link>
              </div>

              {/* Recovery Phrase */}
              <div className="flex flex-row flex-wrap items-center">
                <div className="flex items-center">
                  <p>{t('Recovery phrase last verified:')}</p>
                  <p className="ml-2 text-sm font-medium">{t('11mo ago')}</p>
                </div>
                <Link to={""} className="ml-3 underline" onClick={() => setOpenDialog('verify-password')}>
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
      )}

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
