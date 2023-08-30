import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { HOME_PATH, RETURN_URL_PARAM } from '../../hooks/auth/useAuth';
import useInit from '../../hooks/configure/useInit';
import useIsConfigured from '../../hooks/configure/useIsConfigured';
import { DomainHighlighter, ErrorNotification } from '@youfoundation/common-app';
import ShowRecoveryKey from '../../components/Recovery/ShowRecoveryKey';
import { ProfileSetupData, SocialSetupData } from '../../provider/setup/SetupProvider';
import NewSetupWizard from '../../components/Setup/NewSetupWizard';
import { MinimalLayout } from '../../components/ui/Layout/Layout';
import LoadingPage from '../../components/Setup/Pages/LoadingPage';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: isConfigured, refetch: refreshIsConfigured } = useIsConfigured().isConfigured;

  const {
    initWithData: {
      mutateAsync: doInitWithData,
      status: initWithDataStatus,
      error: initWithDataError,
    },
  } = useInit();

  // Refresh when init is done
  useEffect(() => {
    if (initWithDataStatus === 'success') refreshIsConfigured();
  }, [initWithDataStatus]);

  const redirectToReturn = () => {
    const returnUrl = searchParams.get(RETURN_URL_PARAM);

    if (returnUrl) window.location.href = returnUrl;
    else window.location.href = HOME_PATH;
  };

  useEffect(() => {
    if (isConfigured) redirectToReturn();
  }, [isConfigured]);

  const [hasRecoveryKey, setHasRecoveryKey] = useState(searchParams.has('recovery'));

  useEffect(() => {
    if (hasRecoveryKey) {
      searchParams.set('recovery', 'true');
      setSearchParams(searchParams);
    }
  }, [hasRecoveryKey]);

  return (
    <>
      <Helmet>
        <title>Setup | Odin</title>
      </Helmet>
      <MinimalLayout noShadedBg={true}>
        <div className="min-h-screen">
          <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col p-5">
            {initWithDataStatus === 'loading' || initWithDataStatus === 'success' ? (
              <LoadingPage />
            ) : (
              <>
                <h1 className="mb-5 text-4xl dark:text-white">
                  Odin | Setup
                  <small className="block break-all text-slate-400 dark:text-slate-500 sm:break-normal">
                    <DomainHighlighter>{window.location.hostname}</DomainHighlighter>
                  </small>
                </h1>

                {!hasRecoveryKey ? (
                  <ShowRecoveryKey onConfirm={() => setHasRecoveryKey(true)} />
                ) : (
                  <NewSetupWizard doInitWithData={doInitWithData} />
                )}
              </>
            )}

            <ErrorNotification error={initWithDataError} />
          </div>
        </div>
      </MinimalLayout>
    </>
  );
};

export default Setup;
