import { useYouAuthAuthorization } from '../../../hooks/auth/useAuth';
import { IS_DARK_CLASSNAME, LoadingBlock } from '@youfoundation/common-app';
import { stringifyToQueryParams } from '@youfoundation/js-lib/helpers';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { ROOT_PATH } from '../../../app/App';
import { useEffect } from 'react';

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
  const isAutoAuthorize = window.location.pathname.startsWith(ROOT_PATH);

  const { data: authParams, isLoading } = useParams(ROOT_PATH || '/');
  const stringifiedAuthParams = authParams && stringifyToQueryParams(authParams as any);
  const isDarkMode = document.documentElement.classList.contains(IS_DARK_CLASSNAME);

  useEffect(() => {
    if (isAutoAuthorize)
      window.location.href = `https://${window.location.hostname}${AUTHORIZE_PATH}?${stringifiedAuthParams}`;
  }, [authParams]);

  if (isLoading || isAutoAuthorize) return <LoadingBlock className="h-[16rem] w-full " />;

  return (
    <>
      {authParams ? (
        <Helmet>
          <meta name="youauth" content={stringifyToQueryParams(authParams as any)} />
        </Helmet>
      ) : null}
      {stringifiedAuthParams ? (
        <iframe
          src={`${
            import.meta.env.VITE_CENTRAL_LOGIN_URL
          }?isDarkMode=${isDarkMode}${`&${stringifiedAuthParams}`}`}
          key={stringifiedAuthParams}
          className="h-[16rem] w-full"
        ></iframe>
      ) : null}
    </>
  );
};
