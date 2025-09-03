/* eslint-disable no-fallthrough */
import {t, ActionButton} from '@homebase-id/common-app';
import Section from '../../components/ui/Sections/Section';
import {Link} from "react-router-dom";
import {useEffect, useState} from "react";
import {VerifyPasswordDialog} from "./Tab/VerifyPasswordDialog";

export const SecurityOverview = () => {

  const [showVerifyPasswordDialog, setShowVerifyPasswordDialog] = useState(false);
  const systemSettingsLoading = true;
  const lastVerified = '11mo ago';

  const reset = async () => {
    // get the latest verfication stuff
  }

  useEffect(() => {
    reset();
  }, []);
  const handleConfirmVerifyPassword = async () => {

    reset();
    setShowVerifyPasswordDialog(false);
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
                <Link to={""} className="underline" onClick={() => setShowVerifyPasswordDialog(true)}>
                  verify now
                </Link>
              </div>

              {/* Recovery Phrase */}
              <div className="flex flex-row flex-wrap items-center">
                <div className="flex items-center">
                  <p>{t('Recovery phrase last verified:')}</p>
                  <p className="ml-2 text-sm font-medium">{t('11mo ago')}</p>
                </div>
                <ActionButton className="ml-auto">{t('Manage Recovery Phrase → B1')}</ActionButton>
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
                            isOpen={showVerifyPasswordDialog}
                            onConfirm={handleConfirmVerifyPassword}
                            onCancel={() => setShowVerifyPasswordDialog(false)}/>
    </>
  );
};
