import { useRef } from 'react';
import { MouseEventHandler } from 'react';
import { useState } from 'react';
import { ConnectionImage, OwnerImage, t } from '@youfoundation/common-app';
import useAuth from '../../../hooks/auth/useAuth';
import { Person, useOutsideTrigger } from '@youfoundation/common-app';
import { Times } from '@youfoundation/common-app';
import { LoginBox } from '../LoginBox/LoginBox';

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
          {isAuthenticated && isOwner ? (
            <OwnerImage className="h-8 w-8 rounded-full" size="custom" />
          ) : isAuthenticated && identity ? (
            <ConnectionImage odinId={identity} className="h-8 w-8 rounded-full" size="custom" />
          ) : (
            <Person className="h-4 w-4" />
          )}
          <span className="sr-only">{isAuthenticated ? t('You are logged in') : t('Login')}</span>
        </button>
      )}
      <div
        className={`fixed left-0 right-0 top-[3rem] z-10 sm:left-auto sm:top-[3.5rem] ${
          isOpen ? 'sm:absolute' : 'hidden'
        }`}
        ref={wrapperRef}
      >
        <div className="min-w-[20rem] bg-slate-100 p-8 pt-6 shadow-md dark:bg-slate-700">
          <span className={isAuthenticated ? 'hidden' : ''}>
            <LoginBox />
          </span>
          {isAuthenticated ? (
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
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProfileNav;
