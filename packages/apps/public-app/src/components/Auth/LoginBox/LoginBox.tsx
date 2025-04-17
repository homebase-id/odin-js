import { IS_DARK_CLASSNAME } from '@homebase-id/common-app';
import { useYouAuthAuthorization } from '../../../hooks/auth/useAuth';
import { stringifyToQueryParams } from '@homebase-id/js-lib/helpers';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader } from '@homebase-id/common-app/icons';

export const AUTO_LOGON_PARAM = 'youauth-logon';
const AUTHORIZE_PATH = '/api/owner/v1/youauth/authorize';

const useParams = (returnUrl: string) => {
  const { getAuthorizationParameters } = useYouAuthAuthorization();
  return useQuery({
    queryKey: ['params', returnUrl],
    queryFn: () => getAuthorizationParameters(returnUrl),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// Iframes and navigation is weird
// https://www.aleksandrhovhannisyan.com/blog/react-iframes-back-navigation-bug/
export const LoginBox = ({ returnUrl }: { returnUrl?: string }) => {
  const { data: authParams } = useParams(returnUrl || window.location.href.split('?')[0]);
  const stringifiedAuthParams = authParams && stringifyToQueryParams(authParams);
  const isDarkMode = document.documentElement.classList.contains(IS_DARK_CLASSNAME);

  // Auto logon when requested by a queryString param
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.has(AUTO_LOGON_PARAM) && authParams)
      window.location.href = `https://${searchParams.get(
        AUTO_LOGON_PARAM
      )}${AUTHORIZE_PATH}?${stringifiedAuthParams}`;
  }, [authParams]);

  return (
    <>
      {stringifiedAuthParams ? (
        <>
          <Helmet>
            <meta name="youauth" content={stringifiedAuthParams} />
          </Helmet>
          <iframe
            src={`${
              import.meta.env.VITE_CENTRAL_LOGIN_HOST
            }/anonymous?isDarkMode=${isDarkMode}${`&${stringifiedAuthParams}`}`}
            key={stringifiedAuthParams}
            className="h-[16rem] w-full"
          ></iframe>
        </>
      ) : (
        <Loader className="m-auto h-20 w-20" />
      )}
    </>
  );
};
