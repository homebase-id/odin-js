import {useState} from 'react';
import {ActionButton, t} from '@homebase-id/common-app';
import {PasswordInput} from '../../components/Password/PasswordInput';
import {HOME_PATH, isSafeReturnUrl, useAuth} from '../../hooks/auth/useAuth';

/**
 * The password a recovery gave back, shown only in this browser. "Log in" logs in with it, so the
 * owner never retypes it; the way out, when it doesn't log in (someone who had the password may have
 * saved junk as the copy), is the quieter link under it.
 */
export const RecoveredPassword = ({
  password,
  returnUrl,
  onReset,
}: {
  password: string | undefined;
  returnUrl: string | null;
  onReset: () => void;
}) => {
  const {authenticate} = useAuth();
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  const logIn = async () => {
    if (!password) return;
    setState('loading');
    try {
      if (await authenticate(password)) {
        // Not the login page, so authenticate doesn't redirect by itself
        window.location.href = isSafeReturnUrl(returnUrl) ? returnUrl : HOME_PATH;
        return;
      }
    } catch (error) {
      console.error(error);
    }
    setState('error');
  };

  return (
    <div className="my-2">
      <p className="mb-3">
        {t('This is your password. Only this browser has seen it. You can keep using it, or change it once you are logged in.')}
      </p>
      <PasswordInput
        name="recoveredPassword"
        id="recoveredPassword"
        type="password"
        readOnly
        defaultValue={password}
        autoComplete="off"
      />
      {state === 'error' ? (
        <p className="mt-3 text-red-600">{t('This password does not log in. Set a new one below.')}</p>
      ) : null}
      <div className="mt-5 flex flex-row-reverse">
        <ActionButton onClick={logIn} state={state === 'loading' ? 'loading' : undefined} disabled={!password}>
          {t('Log in')}
        </ActionButton>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        <button type="button" className="underline" onClick={onReset}>
          {t('Does it not log in? Set a new password')}
        </button>
      </p>
    </div>
  );
};
