import { useYouAuthAuthorization } from '../../../hooks/auth/useAuth';
import { IS_DARK_CLASSNAME, LoadingBlock } from '@youfoundation/common-app';
import { stringifyToQueryParams } from '@youfoundation/js-lib/helpers';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { ROOT_PATH } from '../../../app/App';

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
  const { data: authParams, isLoading } = useParams(ROOT_PATH || '/');

  if (isLoading)
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
