import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Input } from '../form/Input';
import { Label } from '../form/Label';
import { Checkbox } from '../form/Checkbox';
import { ActionButton } from '../ui/Buttons/ActionButton';
import { YouAuthorizationParams } from '@homebase-id/js-lib/auth';
import { stringifyToQueryParams } from '@homebase-id/js-lib/helpers';

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,25}(?::\d{1,5})?$/i;
const AUTHORIZE_PATH = '/api/owner/v1/youauth/authorize';
const STORAGE_KEY_IDENTITY = 'youauth-previous-identity';
const STORAGE_KEY_REMEMBER = 'youauth-remember';

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

const getSavedRemember = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true';
  } catch {
    return false;
  }
};

const savePreferences = (identity: string, remember: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY_IDENTITY, identity);
    localStorage.setItem(STORAGE_KEY_REMEMBER, remember ? 'true' : 'false');
  } catch {
    // localStorage unavailable
  }
};

interface YouAuthLoginBoxProps {
  authParams: YouAuthorizationParams;
  className?: string;
}

export const YouAuthLoginBox = ({ authParams, className }: YouAuthLoginBoxProps) => {
  const [identity, setIdentity] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Pre-fill from saved preferences
  useEffect(() => {
    const savedIdentity = getSavedIdentity();
    const savedRemember = getSavedRemember();
    if (savedRemember && savedIdentity) {
      setIdentity(savedIdentity);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (isValidating) return;
      setError(null);

      const strippedIdentity = stripIdentity(identity);
      if (!strippedIdentity) {
        setError('Please enter your Homebase identity');
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

      savePreferences(strippedIdentity, rememberMe);

      const stringifiedParams = stringifyToQueryParams(authParams);

      // Redirect to owner login if identity matches current host
      if (strippedIdentity === window.location.hostname) {
        window.location.href = `https://${strippedIdentity}/owner/login?returnUrl=/owner`;
      } else {
        window.location.href = `https://${strippedIdentity}${AUTHORIZE_PATH}?${stringifiedParams}`;
      }
    },
    [identity, rememberMe, authParams]
  );

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <Label htmlFor="youauth-identity" className="mb-1 text-sm">
            Homebase Id
          </Label>
          <Input
            id="youauth-identity"
            type="text"
            inputMode="url"
            autoComplete="off"
            placeholder="example.homebase.id"
            value={identity}
            onChange={(e) => {
              setIdentity(e.target.value.replace(/\s/g, '.'));
              setError(null);
            }}
          />
          {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="youauth-remember"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <label htmlFor="youauth-remember" className="text-sm">
            Remember me
          </label>
        </div>

        <ActionButton
          type="primary"
          state={isValidating ? 'loading' : undefined}
          onClick={(e) => handleSubmit(e as unknown as FormEvent)}
        >
          Login
        </ActionButton>

        <p className="text-center text-sm">or</p>
        <a
          className="block rounded-md bg-slate-200 px-4 py-2 text-center text-black hover:brightness-90 dark:bg-slate-700 dark:text-white"
          href="https://homebase.id/sign-up"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sign up
        </a>
      </form>
    </div>
  );
};
