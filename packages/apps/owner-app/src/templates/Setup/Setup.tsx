import {useEffect, useState} from 'react';
import {Helmet} from 'react-helmet-async';
import {useSearchParams} from 'react-router-dom';
import {HOME_PATH, RETURN_URL_PARAM} from '../../hooks/auth/useAuth';
import {useInit} from '../../hooks/configure/useInit';
import {useIsConfigured} from '../../hooks/configure/useIsConfigured';
import {DomainHighlighter, ErrorNotification} from '@homebase-id/common-app';
import {ProfileSetupData, SocialSetupData} from '../../provider/setup/SetupProvider';
import SetupWizard from '../../components/Setup/SetupWizard';
import {MinimalLayout} from '../../components/ui/Layout/Layout';
import LoadingPage from '../../components/Setup/Pages/LoadingPage';
import {Eula} from './Eula';

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
    enableAutomatedPasswordRecovery: boolean
}

type State = 'eula' | 'wizard';

export const Setup = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const {data: isConfigured, refetch: refreshIsConfigured} = useIsConfigured().isConfigured;

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
        stateParamVal && ['eula', 'wizard'].includes(stateParamVal)
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
                        {initWithDataStatus === 'pending' || initWithDataStatus === 'success' ? (
                            <LoadingPage/>
                        ) : (
                            <>
                                <h1 className="mb-5 text-4xl dark:text-white">
                                    Homebase | Setup
                                    <small className="block break-all text-slate-400 dark:text-slate-500 sm:break-normal">
                                        <DomainHighlighter>{window.location.hostname}</DomainHighlighter>
                                    </small>
                                </h1>

                                {stepState === 'eula' ?
                                    (<Eula onConfirm={() => setStepState('wizard')}/>) :
                                    (<SetupWizard doInitWithData={doInitWithData}/>)
                                }
                            </>
                        )}

                        <ErrorNotification error={initWithDataError}/>
                    </div>
                </div>
            </MinimalLayout>
        </>
    );
};
