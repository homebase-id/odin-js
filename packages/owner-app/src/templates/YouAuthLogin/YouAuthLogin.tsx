import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { Arrow, t } from '@youfoundation/common-app';
import useAuth, { RETURN_URL_PARAM } from '../../hooks/auth/useAuth';
import { ActionButton } from '@youfoundation/common-app';
import { DomainHighlighter } from '@youfoundation/common-app';
import { MinimalLayout } from '../../components/ui/Layout/Layout';
import { useEffect } from 'react';
import { Loader } from '@youfoundation/common-app';
import useConnection from '../../hooks/connections/useConnection';
import { useMutation } from '@tanstack/react-query';

const useYouAuthLogin = () => {
  const { createHomeToken } = useAuth();

  return {
    homeToken: useMutation(createHomeToken, {
      onError: (err) => {
        console.error(err);
      },
    }),
  };
};

const YouAuthLogin = () => {
  const [searchParams] = useSearchParams();
  const { mutate: createHomeToken, isIdle: isWaitingToCreateToken } = useYouAuthLogin().homeToken;

  const returnUrl = searchParams.get(RETURN_URL_PARAM);
  if (!returnUrl) {
    console.error('No returnUrl found');
    return null;
  }
  const targetDomain = decodeURIComponent(returnUrl);
  const strippedTarget = targetDomain.replace(new RegExp('^(http|https)://'), '').split('/')[0];

  const isOwner = strippedTarget === window.location.host;
  const { data: connectionInfo, isFetching: isFetchingConnectionInfo } = useConnection({
    odinId: !isOwner ? strippedTarget : undefined,
  }).fetch;

  const isConnected = connectionInfo?.status === 'connected';
  const doCancel = () => (window.location.href = returnUrl);

  useEffect(() => {
    if ((isOwner || isConnected) && isWaitingToCreateToken) createHomeToken(targetDomain);
  }, [isOwner, isConnected]);

  if (isFetchingConnectionInfo || isOwner || isConnected) {
    return (
      <MinimalLayout noShadedBg={true}>
        <div className="h-screen">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col p-5">
            <div className="my-auto flex flex-col">
              <Loader className="mx-auto mb-10 h-20 w-20" />
            </div>
          </div>
        </div>
      </MinimalLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('Login')} | Odin</title>
      </Helmet>
      <MinimalLayout noShadedBg={true}>
        <section className="py-20">
          <div className="container mx-auto p-5">
            <div className="max-w-[35rem] dark:text-white">
              <div className="mb-5 flex flex-col sm:flex-row sm:items-center">
                <img
                  src={`https://api.${strippedTarget}/pub/image`}
                  className="w-24 rounded-full sm:mr-4"
                />

                <h1 className="text-4xl ">
                  {t('Login to')} &quot;<DomainHighlighter>{strippedTarget}</DomainHighlighter>
                  &quot;
                  <small className="block text-sm dark:text-white dark:text-opacity-80">
                    &quot;<DomainHighlighter>{strippedTarget}</DomainHighlighter>&quot;{' '}
                    {t('is requesting to verify your identity.')}
                  </small>
                </h1>
              </div>

              <div className="dark:text-white dark:text-opacity-80">
                <p className="mt-2">
                  {t('By logging in you allow')} &quot;
                  <DomainHighlighter>{strippedTarget}</DomainHighlighter>&quot;{' '}
                  {t('to verify your identity and personalise your experience')}
                </p>
              </div>
              <div className="mt-10 flex flex-row-reverse">
                <ActionButton
                  onClick={() => createHomeToken(targetDomain)}
                  type="primary"
                  className="ml-2 w-1/2 sm:w-auto"
                  icon={Arrow}
                >
                  {t('Login')}
                </ActionButton>
                <ActionButton type="secondary" onClick={doCancel} className="w-1/2 sm:w-auto">
                  {t('Cancel')}
                </ActionButton>
              </div>
            </div>
          </div>
        </section>
      </MinimalLayout>
    </>
  );
};

export default YouAuthLogin;
