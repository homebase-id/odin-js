import { FormEvent, useCallback, useEffect, useState } from 'react';
import { type YouAuthorizationParams } from '@homebase-id/js-lib/auth';
import { stringifyToQueryParams } from '@homebase-id/js-lib/helpers';

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,25}(?::\d{1,5})?$/i;
const AUTHORIZE_PATH = '/api/owner/v1/youauth/authorize';
const STORAGE_KEY_IDENTITY = 'youauth-previous-identity';

const stripIdentity = (identity: string) =>
  identity
    .replace(/^(https?):\/\//, '')
    .split('/')[0]
    .toLowerCase();

const pingIdentity = async (identity: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://${identity}/api/guest/v1/auth/ident`);
    const validation = await response.json();
    return validation?.odinId?.toLowerCase() === identity;
  } catch {
    return false;
  }
};

const getSavedIdentity = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY_IDENTITY);
  } catch {
    return null;
  }
};

const saveIdentity = (identity: string) => {
  try {
    localStorage.setItem(STORAGE_KEY_IDENTITY, identity);
  } catch {
    // localStorage unavailable
  }
};

interface YouAuthLoginBoxProps {
  authParams?: YouAuthorizationParams;
  centralLoginHost?: string;
  className?: string;
}

export const YouAuthLoginBox = ({
  authParams,
  centralLoginHost,
  className,
}: YouAuthLoginBoxProps) => {
  const [identity, setIdentity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const saved = getSavedIdentity();
    if (saved) setIdentity(saved);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (isValidating) return;
      setError(null);

      const strippedIdentity = stripIdentity(identity);
      if (!strippedIdentity) {
        if (authParams) {
          if (!centralLoginHost) {
            setError('Central Login host missing envs');
          }
          const stringifiedParams = stringifyToQueryParams(authParams);
          const host = centralLoginHost;
          window.location.href = `${host}/anonymous?${stringifiedParams}`;
        }
        return;
      }

      if (!domainRegex.test(strippedIdentity)) {
        setError('Invalid identity');
        return;
      }

      setIsValidating(true);
      const isValid = await pingIdentity(strippedIdentity);
      setIsValidating(false);

      if (!isValid) {
        setError('Identity not found');
        return;
      }

      saveIdentity(strippedIdentity);
      if (!authParams) {
        setError('Missing authentication parameters');
        return;
      }

      const stringifiedParams = stringifyToQueryParams(authParams);

      if (strippedIdentity === window.location.hostname) {
        window.location.href = `https://${strippedIdentity}/owner/login?returnUrl=/owner`;
      } else {
        window.location.href = `https://${strippedIdentity}${AUTHORIZE_PATH}?${stringifiedParams}`;
      }
    },
    [identity, isValidating, authParams]
  );

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <h1 className="text-lg">YouAuth</h1>
        <div className="flex flex-col">
          <label
            htmlFor="youauth-identity"
            className="text-sm leading-7 text-gray-600 dark:text-gray-500"
          >
            Homebase Id
          </label>
          <input
            className="w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            type="text"
            name="homebase-id"
            id="youauth-identity"
            inputMode="url"
            autoComplete="off"
            value={identity}
            onChange={(e) => {
              setIdentity(e.target.value.replace(/\s/g, '.'));
              setError(null);
            }}
          />
          {error ? <span className="text-sm text-red-500">{error}</span> : null}
        </div>

        <button className="my-3 block cursor-pointer rounded-md bg-indigo-500 px-4 py-2 text-center text-white hover:brightness-90">
          Login
        </button>
      </form>
      <p className="text-center">or</p>
      <a
        className="my-3 block rounded-md bg-slate-200 px-4 py-2 text-center text-black hover:brightness-90"
        href="https://homebase.id/sign-up"
        target="_blank"
        rel="noopener noreferrer"
      >
        Signup
      </a>
    </div>
  );
};
