import { FormEventHandler, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  REDEAL_APP_KEY,
  REDEAL_VAULT_PRIVATE,
  RETURN_URL_PARAM,
  RedealReason,
  redealReasonOf,
  useAuth,
  useValidateAuthorization,
} from '../../hooks/auth/useAuth';
import { useVerifyToken } from '../../hooks/auth/useVerifyToken';
import { MinimalLayout } from '../../components/ui/Layout/Layout';
import UrlNotifier from '../../components/ui/Layout/UrlNotifier/UrlNotifier';
import { Link, useSearchParams } from 'react-router-dom';
import { PasswordInput } from '../../components/Password/PasswordInput';
import {
  t,
  DomainHighlighter,
  Label,
  ActionButton,
  ErrorNotification,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { Loader, Arrow } from '@homebase-id/common-app/icons';

const REDEAL_MESSAGES: Record<RedealReason, string> = {
  '1': 'Your recovery email changed. Log in once more so your recovery uses the new address.',
  [REDEAL_APP_KEY]:
    'This app reads your private drives. Enter your password once more to continue.',
  [REDEAL_VAULT_PRIVATE]:
    'Enter your password to make Vault private: only your own devices will hold its key, not the server. There is no way back.',
};

const Login = () => {
  const [password, setPassword] = useState(import.meta.env.DEV ? 'a' : '');
  const [passwordState, setPasswordState] = useState<'unknown' | 'pending' | 'ready'>('unknown');
  const [state, setState] = useState<'loading' | 'error' | 'success' | undefined>();
  const [error, setError] = useState<unknown | undefined>();
  const isAuthenticated = useDotYouClientContext().isAuthenticated();
  const { authenticate, setFirstPassword, isPasswordSet, checkRedirectToReturn } = useAuth();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get(RETURN_URL_PARAM);
  // Asked for again (REDEAL_REASONS): the form shows even to an owner who is logged in
  const redealReason = redealReasonOf(searchParams);
  const redeal = !!redealReason;
  const makingVaultPrivate = redealReason === REDEAL_VAULT_PRIVATE;
  const recoveryHref = returnUrl
    ? `/owner/account-recovery?${RETURN_URL_PARAM}=${encodeURIComponent(returnUrl)}`
    : '/owner/account-recovery';
  useValidateAuthorization();

  const doLogin: FormEventHandler = async (e) => {
    e.preventDefault();
    setState('loading');
    try {
      await authenticate(password);
      setState('success');
    } catch (ex) {
      setState('error');
      setError(ex);
      console.error(ex);
    }
    return false;
  };

  // In a normal use-case a user would be redirected to the firstRun page, when their password isn't set
  useEffect(() => {
    if (passwordState === 'unknown') {
      (async () => {
        if (!(await isPasswordSet())) {
          setPasswordState('pending');

          console.debug('forcing demo password');
          await setFirstPassword('a', '');
        }

        setPasswordState('ready');
      })();
    }
  }, []);

  const { data: hasValidToken, isFetched } = useVerifyToken();
  useEffect(() => {
    if (isFetched && hasValidToken && !redeal) checkRedirectToReturn();
  }, [isFetched, hasValidToken]);

  if (passwordState === 'unknown' || passwordState === 'pending' || (isAuthenticated && !redeal)) {
    return (
      <MinimalLayout noShadedBg={true} noPadding={true}>
        <ErrorNotification error={error} />
        <div className="h-screen">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col p-5">
            <div className="my-auto flex flex-col">
              <Loader className="mx-auto mb-10 h-20 w-20" />
              {!isAuthenticated ? <div className="text-center">{t('Configuring...')}</div> : null}
            </div>
          </div>
        </div>
      </MinimalLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Login | Homebase</title>
      </Helmet>
      <MinimalLayout noShadedBg={true} noPadding={true}>
        <UrlNotifier />
        {/* Making Vault private can fail after the password was right: say why */}
        {makingVaultPrivate ? <ErrorNotification error={error} /> : null}
        <section className="body-font flex h-full pt-24">
          <div className="container m-auto h-full max-w-[35rem] p-5">
            <div className="">
              <form onSubmit={doLogin}>
                <h1 className="mb-5 text-4xl dark:text-white">
                  Homebase | Login
                  <small className="block break-all text-slate-400 dark:text-slate-500 sm:break-normal">
                    <DomainHighlighter>{window.location.hostname}</DomainHighlighter>
                  </small>
                </h1>
                {redealReason ? (
                  <p className="mb-4 text-slate-600 dark:text-slate-400">
                    {t(REDEAL_MESSAGES[redealReason])}
                  </p>
                ) : null}
                <div className="mb-4">
                  <Label htmlFor="password" className="text-sm leading-7 dark:text-gray-400">
                    Password
                  </Label>
                  <PasswordInput
                    name="password"
                    id="password"
                    autoFocus
                    required
                    onChange={(e) => setPassword(e.target.value)}
                    defaultValue={password}
                    autoComplete="current-password"
                  />
                </div>
                <ActionButton
                  className="mt-10 w-full px-5 py-3"
                  type="primary"
                  icon={Arrow}
                  state={state}
                  size="none"
                >
                  {makingVaultPrivate ? t('Make Vault private') : t('login')}
                </ActionButton>
                <Link
                  to={recoveryHref}
                  className="mt-5 block text-center text-slate-400 hover:underline"
                >
                  {t('Forgot your password?')}
                </Link>
              </form>
            </div>
          </div>
        </section>
      </MinimalLayout>
    </>
  );
};

export default Login;
