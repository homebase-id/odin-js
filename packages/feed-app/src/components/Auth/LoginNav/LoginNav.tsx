import { useState, useRef } from 'react';
import useOutsideTrigger from '../../../hooks/clickedOutsideTrigger/useClickedOutsideTrigger';
import Person from '../../ui/Icons/Person/Person';
import Times from '../../ui/Icons/Times/Times';
import { LoginBox } from '../LoginBox/LoginBox';
import useAuth from '../../../hooks/auth/useAuth';
import IdentityImage from '../IdentityImage/IdentityImage';
import { t } from '../../../helpers/i18n/dictionary';

const LoginNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, getIdentity, logout } = useAuth();
  const identity = getIdentity();

  const wrapperRef = useRef<HTMLDivElement>(null);
  useOutsideTrigger(wrapperRef, () => setIsOpen(false));

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
            <IdentityImage odinId={identity} className="h-8 w-8 rounded-full" size="custom" />
          ) : (
            <Person className="h-4 w-4" />
          )}
        </button>
      )}
      {isOpen ? (
        <div
          className="fixed left-0 right-0 top-[4rem] z-50 sm:absolute sm:left-auto sm:top-[3.5rem]"
          ref={wrapperRef}
        >
          <div className="min-w-[20rem] bg-slate-100 p-8 pt-6 shadow-md dark:bg-slate-700">
            {isAuthenticated ? (
              <>
                <p className="mb-4">
                  {t('Logged in as: ')}{' '}
                  <a
                    href={`https://${identity ?? ''}`}
                    className="underline"
                    target={'_blank'}
                    rel="noopener noreferrer"
                  >
                    {identity}
                  </a>
                </p>
                <button
                  onClick={logout}
                  className="mt-2 block w-full rounded border-0 bg-green-500 px-4 py-2 text-white hover:bg-green-600 focus:outline-none "
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
