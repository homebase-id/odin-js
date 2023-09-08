import { useState, useEffect } from 'react';
import { useYouAuthAuthorization } from '../../../hooks/auth/useAuth';
import { IS_DARK_CLASSNAME, LoadingBlock } from '@youfoundation/common-app';
import { YouAuthorizationParams } from '@youfoundation/js-lib/auth';
import { stringifyToQueryParams } from '@youfoundation/js-lib/helpers';
import { Helmet } from 'react-helmet-async';

export const LoginBox = () => {
  const [authParams, setAuthParams] = useState<YouAuthorizationParams>();
  const { getAuthorizationParameters } = useYouAuthAuthorization();

  useEffect(() => {
    (async () => {
      if (!authParams) setAuthParams(await getAuthorizationParameters('/'));
    })();
  }, []);

  if (!authParams)
    return (
      <>
        <LoadingBlock className="h-[16rem] w-full " />
      </>
    );

  return (
    <>
      {authParams ? (
        <Helmet>
          <meta name="youauth" content={stringifyToQueryParams(authParams as any)} />
        </Helmet>
      ) : null}
      <iframe
        src={`${
          import.meta.env.VITE_CENTRAL_LOGIN_URL
        }?isDarkMode=${document.documentElement.classList.contains(IS_DARK_CLASSNAME)}${
          authParams ? `&${stringifyToQueryParams(authParams as any)}` : ''
        }`}
        className="h-[16rem] w-full"
      ></iframe>
    </>
  );
};
