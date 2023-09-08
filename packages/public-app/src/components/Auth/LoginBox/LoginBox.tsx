import { IS_DARK_CLASSNAME } from '@youfoundation/common-app';
import { useYouAuthAuthorization } from '../../../hooks/auth/useAuth';
import { useEffect, useState } from 'react';
import { stringifyToQueryParams } from '@youfoundation/js-lib/helpers';
import { YouAuthorizationParams } from '@youfoundation/js-lib/auth';
import { Helmet } from 'react-helmet-async';

const CENTRALIZED_LOGIN_BOX = !!import.meta.env.VITE_VERSION;

export const LoginBox = ({ returnUrl }: { returnUrl?: string }) => {
  return CENTRALIZED_LOGIN_BOX ? (
    <CentralLoginBox returnUrl={returnUrl} />
  ) : (
    <LocalLoginBox returnUrl={returnUrl} />
  );
};

const CentralLoginBox = ({ returnUrl }: { returnUrl?: string }) => {
  const [authParams, setAuthParams] = useState<YouAuthorizationParams>();
  const { getAuthorizationParameters } = useYouAuthAuthorization();

  useEffect(() => {
    (async () => {
      setAuthParams(await getAuthorizationParameters(returnUrl || window.location.href));
    })();
  }, [returnUrl]);

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
        // loading="lazy"
      ></iframe>
    </>
  );
};

const LocalLoginBox = ({ returnUrl }: { returnUrl?: string }) => {
  return <>Login is not supported</>;
  //   const { authenticate } = useAuth();
  //   const [identity, setIdentity] = useState('');

  //   const doLogin: FormEventHandler = (e) => {
  //     e.preventDefault();

  //     authenticate(identity, returnUrl || window.location.href);
  //   };

  //   const doRegister: MouseEventHandler = (e) => {
  //     e.preventDefault();

  //     console.log('register');
  //   };

  //   return (
  //     <>
  //       <form onSubmit={doLogin}>
  //         <p className="text-lg">YouAuth</p>
  //         <label htmlFor="homebase-id" className="text-sm leading-7 text-gray-600 dark:text-gray-400">
  //           Homebase Id
  //         </label>
  //         <input
  //           type="text"
  //           name="homebase-id"
  //           id="homebase-id"
  //           defaultValue={identity}
  //           required
  //           className="w-full rounded border border-gray-300 bg-gray-100 bg-opacity-50 px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:bg-transparent focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
  //           onChange={(e) => setIdentity(e.target.value)}
  //         />
  //         <button className="mt-2 block w-full rounded border-0 bg-green-500 px-4 py-2 text-white hover:bg-green-600 focus:outline-none ">
  //           {t('login')}
  //         </button>
  //       </form>
  //       <p className="my-3 text-center">{t('or')}</p>
  //       <button
  //         onClick={doRegister}
  //         className="block w-full rounded border-0 bg-button px-4 py-2 text-white hover:bg-indigo-600 focus:outline-none "
  //       >
  //         {t('signup')}
  //       </button>
  //     </>
  //   );
};
