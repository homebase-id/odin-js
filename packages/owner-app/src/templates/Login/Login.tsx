import { FormEventHandler, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Arrow, CloseEye, Eye, t } from '@youfoundation/common-app';
import { useAuth } from '../../hooks/auth/useAuth';
import { ActionButton } from '@youfoundation/common-app';
import { Input } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import { Loader } from '@youfoundation/common-app';
import { MinimalLayout } from '../../components/ui/Layout/Layout';
import UrlNotifier from '../../components/ui/Layout/UrlNotifier/UrlNotifier';
import { DomainHighlighter } from '@youfoundation/common-app';
import { Link } from 'react-router-dom';

const Login = () => {
  const [password, setPassword] = useState(import.meta.env.DEV ? 'a' : '');
  const [passwordState, setPasswordState] = useState<'unknown' | 'pending' | 'ready'>('unknown');
  const [state, setState] = useState<'loading' | 'error' | 'success' | undefined>();
  const { authenticate, setFirstPassword, isPasswordSet, isAuthenticated } = useAuth();

  const doLogin: FormEventHandler = async (e) => {
    e.preventDefault();
    setState('loading');
    try {
      await authenticate(password);
      setState('success');
    } catch (ex) {
      // Todo show message what failed
      console.error(ex);
      setState('error');
    }
    return false;
  };

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

  if (passwordState === 'unknown' || passwordState === 'pending' || isAuthenticated) {
    return (
      <MinimalLayout noShadedBg={true} noPadding={true}>
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
                <div className="mb-4">
                  <Label htmlFor="password" className="text-sm leading-7  dark:text-gray-400">
                    Password
                  </Label>
                  <PasswordInput
                    name="password"
                    id="password"
                    autoFocus
                    required
                    onChange={(e) => setPassword(e.target.value)}
                    defaultValue={password}
                  />
                </div>
                <ActionButton
                  className="mt-10 w-full"
                  type="primary"
                  icon={Arrow}
                  state={state}
                  size="large"
                >
                  {t('login')}
                </ActionButton>
                <Link
                  to="/owner/account-recovery"
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

const PasswordInput = (
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShow(false), 1000 * 15);
    return () => clearTimeout(timeout);
  }, [show]);

  return (
    <div className="relative">
      <Input
        {...props}
        ref={undefined}
        type={show ? 'input' : 'password'}
        autoComplete="current-password"
        className={`appearance-none pr-10 ${props.className}`}
      />
      <a
        onClick={(e) => {
          setShow(!show);
        }}
        className="absolute bottom-0 right-0 top-0 flex cursor-pointer items-center justify-center pr-3 opacity-70 transition-opacity hover:opacity-100"
      >
        {show ? <CloseEye className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
      </a>
    </div>
  );
};
