import { useYouAuthAuthorization } from '../../../hooks/auth/useAuth';
import { IS_DARK_CLASSNAME, Loader, LoadingBlock } from '@youfoundation/common-app';
import { stringifyToQueryParams } from '@youfoundation/js-lib/helpers';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { ROOT_PATH } from '../../../app/App';
import { useEffect } from 'react';
import { MinimalLayout } from '../../ui/Layout/Layout';
import { ApiType, DotYouClient } from '@youfoundation/js-lib/core';

const AUTHORIZE_PATH = '/api/owner/v1/youauth/authorize';

const useParams = (returnUrl: string) => {
  const { getAuthorizationParameters } = useYouAuthAuthorization();
  return useQuery({
    queryKey: ['params'],
    queryFn: () => getAuthorizationParameters(returnUrl),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const LoginBox = () => {
  const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
  const { data: authParams, isLoading } = useParams(returnUrl || ROOT_PATH || '/');

  const stringifiedAuthParams = authParams && stringifyToQueryParams(authParams);
  const isDarkMode = document.documentElement.classList.contains(IS_DARK_CLASSNAME);

  const isAutoAuthorize = window.location.pathname.startsWith(ROOT_PATH);

  useEffect(() => {
    const host = new DotYouClient({
      identity: window.location.hostname,
      api: ApiType.Guest,
    }).getRoot();
    if (isAutoAuthorize && stringifiedAuthParams)
      window.location.href = `${host}${AUTHORIZE_PATH}?${stringifiedAuthParams}`;
  }, [authParams]);

  if (isLoading || isAutoAuthorize) return <LoadingBlock className="h-[16rem] w-full " />;

  return (
    <>
      {authParams ? (
        <Helmet>
          <meta name="youauth" content={stringifyToQueryParams(authParams)} />
        </Helmet>
      ) : null}
      {stringifiedAuthParams ? (
        <iframe
          src={`${
            import.meta.env.VITE_CENTRAL_LOGIN_HOST
          }/anonymous?isDarkMode=${isDarkMode}${`&${stringifiedAuthParams}`}`}
          key={stringifiedAuthParams}
          className="h-[16rem] w-full"
        ></iframe>
      ) : null}
    </>
  );
};

export const AutoAuthorize = () => {
  const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
  const { data: authParams } = useParams(returnUrl || ROOT_PATH || '/');
  const stringifiedAuthParams = authParams && stringifyToQueryParams(authParams);

  useEffect(() => {
    if (stringifiedAuthParams)
      window.location.href = `https://${window.location.host}${AUTHORIZE_PATH}?${stringifiedAuthParams}`;
  }, [authParams]);

  return (
    <>
      <MinimalLayout noShadedBg={true} noPadding={true}>
        <div className="h-screen">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col p-5">
            <div className="my-auto flex flex-col">
              <Loader className="mx-auto mb-10 h-20 w-20" />
            </div>
          </div>
        </div>
      </MinimalLayout>
    </>
  );
};
