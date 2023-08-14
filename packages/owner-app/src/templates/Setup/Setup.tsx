import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { HOME_PATH, RETURN_URL_PARAM } from '../../hooks/auth/useAuth';
import useInit from '../../hooks/configure/useInit';
import useIsConfigured from '../../hooks/configure/useIsConfigured';
import { ErrorNotification } from '@youfoundation/common-app';
import Section from '../../components/ui/Sections/Section';
import SetupWizard from '../../components/Setup/SetupWizard';
import ShowRecoveryKey from '../../components/Recovery/ShowRecoveryKey';
import { ProfileSetupData, SocialSetupData } from '../../provider/setup/SetupProvider';

export interface onChangeParams {
  target: {
    name: string;
    value: unknown;
  };
}

export interface WelcomeData {
  profile: ProfileSetupData;
  social: SocialSetupData;
  circles: { name: string; description: string }[];
}

export const SETUP_PATH = '/owner/setup';

const Setup = () => {
  const [searchParams] = useSearchParams();
  const { data: isConfigured, refetch: refreshIsConfigured } = useIsConfigured().isConfigured;

  const {
    init: { mutateAsync: doInit, status: initStatus, error: initError },
    initWithData: {
      mutateAsync: doInitWithData,
      status: initWithDataStatus,
      error: initWithDataError,
    },
  } = useInit();

  // Refresh when init is done
  useEffect(() => {
    if (initStatus === 'success' || initWithDataStatus === 'success') refreshIsConfigured();
  }, [initStatus, initWithDataStatus]);

  const redirectToReturn = () => {
    const returnUrl = searchParams.get(RETURN_URL_PARAM);
    if (returnUrl) {
      window.location.href = decodeURIComponent(returnUrl);
    } else {
      window.location.href = HOME_PATH;
    }
  };

  useEffect(() => {
    if (isConfigured) redirectToReturn();
  }, [isConfigured]);

  const [hasRecoveryKey, setHasRecoveryKey] = useState(false);

  return (
    <>
      <Helmet>
        <title>Setup | Odin</title>
      </Helmet>

      <div className="min-h-screen">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col p-5">
          {!hasRecoveryKey ? (
            <Section>
              <ShowRecoveryKey onConfirm={() => setHasRecoveryKey(true)} />
            </Section>
          ) : (
            <Section>
              <ErrorNotification error={initError || initWithDataError} />
              <SetupWizard doInitWithData={doInitWithData} doInit={doInit} />
            </Section>
          )}
        </div>
      </div>
    </>
  );
};

export default Setup;
