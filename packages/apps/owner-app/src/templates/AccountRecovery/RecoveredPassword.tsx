import {ActionButton, ActionLink, t} from '@homebase-id/common-app';
import {PasswordInput} from '../../components/Password/PasswordInput';
import {RETURN_URL_PARAM} from '../../hooks/auth/useAuth';

/** The login page, coming back to `returnUrl` after login when there is one. */
// eslint-disable-next-line react-refresh/only-export-components
export const loginHref = (returnUrl: string | null) =>
  returnUrl ? `/owner/login?${RETURN_URL_PARAM}=${encodeURIComponent(returnUrl)}` : '/owner/login';

/**
 * The password a recovery gave back, shown only in this browser, with the way out when it doesn't
 * log in: someone who had the password may have saved junk as the copy.
 */
export const RecoveredPassword = ({
  password,
  returnUrl,
  onLogin,
  onReset,
}: {
  password: string | undefined;
  returnUrl: string | null;
  onLogin?: () => void;
  onReset: () => void;
}) => (
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
    <div className="mt-5 flex flex-row-reverse justify-between gap-2">
      <ActionLink href={loginHref(returnUrl)} onClick={onLogin}>{t('Login')}</ActionLink>
      <ActionButton type="secondary" onClick={onReset}>
        {t('It does not work: set a new password')}
      </ActionButton>
    </div>
  </div>
);
