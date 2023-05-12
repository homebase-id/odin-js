import { FormEventHandler, useRef } from 'react';
import { MouseEventHandler } from 'react';
import { useState } from 'react';
import { IS_DARK_CLASSNAME, t } from '@youfoundation/common-app';
import useAuth from '../../../hooks/auth/useAuth';
import { ConnectionImage, OwnerImage } from '../../Post/Common/Blocks/Author/Image';
import { Person, useOutsideTrigger } from '@youfoundation/common-app';
import { Times } from '@youfoundation/common-app';

const CENTRALIZED_LOGIN_BOX = !!import.meta.env.VITE_VERSION;

const ProfileNav = () => {
  const { logout, isAuthenticated, getIdentity, isOwner } = useAuth();
  const identity = getIdentity();

  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));

  const doLogout: MouseEventHandler = async (e) => {
    e.preventDefault();

    await logout();
    window.location.reload();
  };

  return (
    <div className="relative h-8">
      {isOpen ? (
        <button
          key={'close'}
          className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center
            rounded-full bg-slate-300
          dark:bg-slate-500`}
        >
          <Times className="h-4 w-4" />
        </button>
      ) : (
        <button
          key={'open'}
          className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isAuthenticated && identity ? (
            isOwner ? (
              <OwnerImage className="h-8 w-8 rounded-full" size="custom" />
            ) : (
              <ConnectionImage odinId={identity} className="h-8 w-8 rounded-full" size="custom" />
            )
          ) : (
            <Person className="h-4 w-4" />
          )}
        </button>
      )}
      {isOpen ? (
        <div
          className="fixed left-0 right-0 top-[4rem] z-10 sm:absolute sm:left-auto sm:top-[3.5rem]"
          ref={wrapperRef}
        >
          <div className="min-w-[20rem] bg-slate-100 p-8 pt-6 shadow-md dark:bg-slate-700">
            {!isAuthenticated ? (
              <LoginBox />
            ) : (
              <>
                <p className="mb-4">
                  {isOwner ? (
                    <>{t('Logged in as the owner')}</>
                  ) : (
                    <>
                      {t('Logged in with: ')}{' '}
                      <a
                        href={`https://${identity ?? ''}`}
                        className="underline"
                        target={'_blank'}
                        rel="noopener noreferrer"
                      >
                        {identity}
                      </a>
                    </>
                  )}
                </p>
                <button
                  onClick={doLogout}
                  className="mt-2 block w-full rounded border-0 bg-green-500 px-4 py-2 text-white hover:bg-green-600 focus:outline-none "
                >
                  {t('logout')}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const LoginBox = ({ returnUrl }: { returnUrl?: string }) => {
  return CENTRALIZED_LOGIN_BOX ? (
    <CentralLoginBox returnUrl={returnUrl} />
  ) : (
    <LocalLoginBox returnUrl={returnUrl} />
  );
};

const CentralLoginBox = ({ returnUrl }: { returnUrl?: string }) => {
  return (
    <iframe
      src={`${
        import.meta.env.VITE_CENTRAL_LOGIN_URL
      }?isDarkMode=${document.documentElement.classList.contains(IS_DARK_CLASSNAME)}${
        returnUrl ? `&returnUrl=${returnUrl}` : ''
      }`}
      className="h-[16rem] w-full"
    ></iframe>
  );
};

const LocalLoginBox = ({ returnUrl }: { returnUrl?: string }) => {
  const { authenticate } = useAuth();
  const [identity, setIdentity] = useState('');

  const doLogin: FormEventHandler = (e) => {
    e.preventDefault();

    authenticate(identity, returnUrl || window.location.href);
  };

  const doRegister: MouseEventHandler = (e) => {
    e.preventDefault();

    console.log('register');
  };

  return (
    <>
      <form onSubmit={doLogin}>
        <p className="text-lg">YouAuth</p>
        <label htmlFor="odin-id" className="text-sm leading-7 text-gray-600 dark:text-gray-400">
          Odin Id
        </label>
        <input
          type="text"
          name="odin-id"
          id="odin-id"
          defaultValue={identity}
          required
          className="w-full rounded border border-gray-300 bg-gray-100 bg-opacity-50 px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:bg-transparent focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          onChange={(e) => setIdentity(e.target.value)}
        />
        <button className="mt-2 block w-full rounded border-0 bg-green-500 px-4 py-2 text-white hover:bg-green-600 focus:outline-none ">
          {t('login')}
        </button>
      </form>
      <p className="my-3 text-center">or</p>
      <button
        onClick={doRegister}
        className="block w-full rounded border-0 bg-button px-4 py-2 text-white hover:bg-indigo-600 focus:outline-none "
      >
        {t('signup')}
      </button>
    </>
  );
};

export default ProfileNav;
