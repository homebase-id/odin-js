import { FormEventHandler, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Arrow, t } from '@youfoundation/common-app';
import useAuth from '../../hooks/auth/useAuth';
import { ActionButton } from '@youfoundation/common-app';
import { Input } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import { Loader } from '@youfoundation/common-app';
import { MinimalLayout } from '../../components/ui/Layout/Layout';
import UrlNotifier from '../../components/ui/Layout/UrlNotifier/UrlNotifier';
import { DomainHighlighter } from '@youfoundation/common-app';

const Login = () => {
  const [password, setPassword] = useState('a');
  const [passwordState, setPasswordState] = useState<'unknown' | 'pending' | 'ready'>('unknown');
  const [state, setState] = useState<'loading' | 'error' | 'success' | undefined>();
  const { authenticate, setNewPassword, isPasswordSet } = useAuth();

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
          await setNewPassword('a', '');
        }

        setPasswordState('ready');
      })();
    }
  }, []);

  if (passwordState === 'unknown' || passwordState === 'pending') {
    return (
      <MinimalLayout noShadedBg={true} noPadding={true}>
        <div className="h-screen">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col p-5">
            <div className="my-auto flex flex-col">
              <Loader className="mx-auto mb-10 h-20 w-20" />
              <div className="text-center">{t('Configuring...')}</div>
            </div>
          </div>
        </div>
      </MinimalLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Login | Odin</title>
      </Helmet>
      <MinimalLayout noShadedBg={true} noPadding={true}>
        <UrlNotifier />
        <section className="body-font flex h-full pt-24">
          <div className="container m-auto h-full max-w-[35rem] p-5">
            <div className="">
              <form onSubmit={doLogin}>
                <h1 className="mb-5 text-4xl dark:text-white">
                  Odin | Login
                  <small className="block break-all text-slate-400 dark:text-slate-500 sm:break-normal">
                    <DomainHighlighter>{window.location.hostname}</DomainHighlighter>
                  </small>
                </h1>

                <div className="mb-4">
                  <Label htmlFor="odin-id" className="text-sm leading-7  dark:text-gray-400">
                    Odin id
                  </Label>

                  <Input
                    type="text"
                    name="odin-id"
                    id="odin-id"
                    required
                    defaultValue={window.location.hostname}
                    disabled={true}
                    readOnly={true}
                  />
                </div>
                <div className="mb-4">
                  <Label htmlFor="password" className="text-sm leading-7  dark:text-gray-400">
                    Password
                  </Label>
                  <Input
                    type="text"
                    name="password"
                    id="password"
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
              </form>
            </div>
          </div>
        </section>
      </MinimalLayout>
    </>
  );
};

export default Login;
