import { useYouAuthAuthorization } from '../../../hooks/auth/useAuth';
import {
  FEED_ROOT_PATH,
  OWNER_APPS_ROOT,
  YouAuthLoginBox,
} from '@homebase-id/common-app';
import { Loader } from '@homebase-id/common-app/icons';
import { stringifyToQueryParams } from '@homebase-id/js-lib/helpers';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { MinimalLayout } from '../../ui/Layout/Layout';
import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';

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
  const { data: authParams } = useParams(returnUrl || FEED_ROOT_PATH || '/');

  const stringifiedAuthParams = authParams && stringifyToQueryParams(authParams);

  const isAutoAuthorize = window.location.pathname.startsWith(OWNER_APPS_ROOT);

  useEffect(() => {
    const host = new DotYouClient({
      hostIdentity: window.location.hostname,
      api: ApiType.Guest,
    }).getRoot();
    if (isAutoAuthorize && stringifiedAuthParams)
      window.location.href = `${host}${AUTHORIZE_PATH}?${stringifiedAuthParams}`;
  }, [isAutoAuthorize, stringifiedAuthParams]);

  return (
    <>
      <Helmet>
        <meta name="youauth" content={stringifiedAuthParams as string} />
      </Helmet>
      <YouAuthLoginBox authParams={authParams} centralLoginHost={import.meta.env.VITE_CENTRAL_LOGIN_HOST} />
    </>
  );
};

export const AutoAuthorize = () => {
  const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
  const { data: authParams } = useParams(returnUrl || FEED_ROOT_PATH || '/');
  const stringifiedAuthParams = authParams && stringifyToQueryParams(authParams);

  useEffect(() => {
    if (stringifiedAuthParams)
      window.location.href = `https://${window.location.host}${AUTHORIZE_PATH}?${stringifiedAuthParams}`;
  }, [stringifiedAuthParams]);

  return (
    <MinimalLayout noShadedBg={true} noPadding={true}>
      <div className="h-screen">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col p-5">
          <div className="my-auto flex flex-col">
            <Loader className="mx-auto mb-10 h-20 w-20" />
          </div>
        </div>
      </div>
    </MinimalLayout>
  );
};
