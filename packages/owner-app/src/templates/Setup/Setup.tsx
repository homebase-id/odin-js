import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { HOME_PATH, RETURN_URL_PARAM } from '../../hooks/auth/useAuth';
import useInit from '../../hooks/configure/useInit';
import useIsConfigured from '../../hooks/configure/useIsConfigured';
import {
  ActionButton,
  DomainHighlighter,
  ErrorNotification,
  Label,
  t,
} from '@youfoundation/common-app';
import ShowRecoveryKey from '../../components/Recovery/ShowRecoveryKey';
import { ProfileSetupData, SocialSetupData } from '../../provider/setup/SetupProvider';
import SetupWizard from '../../components/Setup/SetupWizard';
import { MinimalLayout } from '../../components/ui/Layout/Layout';
import LoadingPage from '../../components/Setup/Pages/LoadingPage';
import Checkbox from '../../components/Form/Checkbox';
import useEula from '../../hooks/eula/useEula';

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

type State = 'eula' | 'recovery' | 'wizard';

export const Setup = () => {
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

  const stateParamVal = searchParams.get('state');
  const [stepState, setStepState] = useState<State>(
    stateParamVal && ['eula', 'recovery', 'wizard'].includes(stateParamVal)
      ? (stateParamVal as State)
      : 'eula'
  );

  useEffect(() => {
    if (!stepState) return;
    searchParams.set('state', stepState);
    setSearchParams(searchParams);
  }, [stepState]);

  return (
    <>
      <Helmet>
        <title>Setup | Homebase</title>
      </Helmet>
      <MinimalLayout noShadedBg={true}>
        <div className="min-h-screen">
          <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col p-5">
            {initWithDataStatus === 'loading' || initWithDataStatus === 'success' ? (
              <LoadingPage />
            ) : (
              <>
                <h1 className="mb-5 text-4xl dark:text-white">
                  Homebase | Setup
                  <small className="block break-all text-slate-400 dark:text-slate-500 sm:break-normal">
                    <DomainHighlighter>{window.location.hostname}</DomainHighlighter>
                  </small>
                </h1>

                {stepState === 'eula' ? (
                  <Eula onConfirm={() => setStepState('recovery')} />
                ) : stepState === 'recovery' ? (
                  <ShowRecoveryKey onConfirm={() => setStepState('wizard')} />
                ) : (
                  <SetupWizard doInitWithData={doInitWithData} />
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

const Eula = ({ onConfirm }: { onConfirm: () => void }) => {
  const {
    isEulaSignatureRequired: { data: requiredVersion, isFetched: isEulaSignatureRequiredFetched },
    markEulaAsAccepted: { mutateAsync: doMarkEulaAsAccepted, status: markEulaAsAcceptedStatus },
  } = useEula();

  useEffect(() => {
    if (!requiredVersion && isEulaSignatureRequiredFetched) onConfirm();
  }, [requiredVersion]);

  if (!requiredVersion) return null;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.reportValidity()) {
          console.log(requiredVersion);
          await doMarkEulaAsAccepted(requiredVersion);

          onConfirm();
        }
      }}
    >
      <div className="flex flex-col gap-5">
        <p>
          This End-User License Agreement (EULA) is a legal agreement between you (the User) and
          Homebase (Company) for the use of Homebase (Software). By installing, copying, or using
          the Software, you agree to be bound by the terms and conditions of this EULA. The Company
          grants the User a non-exclusive, non-transferable, limited license to use the Software
          solely for personal or internal business purposes, subject to the terms and conditions
          herein.
        </p>
        <p>
          The User agrees not to reverse engineer, decompile, disassemble, or attempt to derive the
          source code of the Software. The User may not sublicense, transfer, or distribute the
          Software, except as expressly permitted by applicable law. The license granted herein is
          effective until terminated by either party. The Company may terminate the license at any
          time for breach of this EULA. Upon termination, the User must cease using the Software and
          destroy all copies in their possession. The User acknowledges that the Software is
          provided &quot;as is&quot; without warranty of any kind. The Company shall not be liable
          for any damages arising out of the use or inability to use the Software.
        </p>
      </div>
      <div className="my-5 flex flex-row-reverse items-center gap-4">
        <label htmlFor="eula" className="mb-0">
          I have read and agree to the EULA
        </label>
        <Checkbox name="eula" id="eula" required={true} />
      </div>
      <div className="flex flex-row-reverse">
        <ActionButton state={markEulaAsAcceptedStatus}>{t('Confirm')}</ActionButton>
      </div>
    </form>
  );
};
