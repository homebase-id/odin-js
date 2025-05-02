import { useState, useRef } from 'react';

import { LoginBox } from '../LoginBox/LoginBox';
import {
  useOutsideTrigger,
  ConnectionImage,
  t,
  useOdinClientContext,
  logoutOwnerAndAllApps,
} from '@homebase-id/common-app';
import { ApiType, OdinClient } from '@homebase-id/js-lib/core';
import { Times, Person } from '@homebase-id/common-app/icons';

const LoginNav = () => {
  const [isOpen, setIsOpen] = useState(false);

  const odinClient = useOdinClientContext();
  const isAuthenticated = odinClient.isAuthenticated();
  const identity = odinClient.getLoggedInIdentity();

  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));

  return (
    <div className="relative h-8">
      {isOpen ? (
        <button
          key={'close'}
          className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-500`}
        >
          <Times className="h-5 w-5" />
        </button>
      ) : (
        <button
          key={'open'}
          className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isAuthenticated && identity ? (
            <ConnectionImage odinId={identity} className="h-8 w-8 rounded-full" size="custom" />
          ) : (
            <Person className="h-5 w-5" />
          )}
        </button>
      )}
      {isOpen ? (
        <div
          className="fixed left-0 right-0 top-[4rem] z-40 sm:absolute sm:left-auto sm:top-[3.5rem]"
          ref={wrapperRef}
        >
          <div className="min-w-[20rem] bg-slate-100 p-8 pt-6 shadow-md dark:bg-slate-700">
            {isAuthenticated ? (
              <>
                <p className="mb-4">
                  {t('Logged in as: ')}{' '}
                  <a
                    href={
                      identity
                        ? new OdinClient({ hostIdentity: identity, api: ApiType.Guest }).getRoot()
                        : ''
                    }
                    className="underline"
                    target={'_blank'}
                    rel="noopener noreferrer"
                  >
                    {identity}
                  </a>
                </p>
                <button
                  onClick={logoutOwnerAndAllApps}
                  className="mt-2 block w-full rounded border-0 bg-green-500 px-4 py-2 text-white hover:bg-green-600 focus:outline-none"
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <LoginBox />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LoginNav;
