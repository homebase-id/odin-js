import { FormEventHandler, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { t } from '../../helpers/i18n/dictionary';
import useAuth from '../../hooks/auth/useAuth';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import Input from '../../components/Form/Input';
import Label from '../../components/Form/Label';
import { MinimalLayout } from '../../components/ui/Layout/Layout';
import UrlNotifier from '../../components/ui/Layout/UrlNotifier/UrlNotifier';
import { DomainHighlighter } from '@youfoundation/common-app';
import { useSearchParams } from 'react-router-dom';
import { FIRST_RUN_TOKEN_STORAGE_KEY } from '../../hooks/configure/useInit';
import Alert from '../../components/ui/Alerts/Alert/Alert';

const FirstRun = () => {
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');

  const [state, setState] = useState<'loading' | 'error' | 'success' | undefined>();
  const { authenticate, finalizeRegistration } = useAuth();

  const [searchParams] = useSearchParams();
  const firstRunToken = searchParams.get('frt');

  const doNext: FormEventHandler = async (e) => {
    e.preventDefault();
    setState('loading');
    try {
      if (password !== retypePassword) {
        window.alert('Passwords do not match; TODO: make this nicer');
        setState('error');
        return;
      }

      localStorage.setItem(FIRST_RUN_TOKEN_STORAGE_KEY, firstRunToken || ''); // Store FRT to localStorage so it can be used on initialize later
      await finalizeRegistration(password, firstRunToken || '');

      //TODO: need a 'success' screen or something;
      // => No we don't, it should just login ;-)
      await authenticate(password);

      setState('success');
    } catch (ex) {
      // Todo show message what failed
      console.error(ex);
      setState('error');
    }
    return false;
  };

  return (
    <>
      <Helmet>
        <title>Setup | Odin</title>
      </Helmet>
      <MinimalLayout noShadedBg={true}>
        <UrlNotifier />
        <section className="body-font flex h-full pt-24 ">
          <div className="container m-auto h-full max-w-[35rem] p-5">
            <form onSubmit={doNext}>
              <h1 className="mb-5 text-4xl dark:text-white">
                YouAuth | Setup
                <small className="block break-all text-slate-400 dark:text-slate-500 sm:break-normal">
                  <DomainHighlighter>{window.location.hostname}</DomainHighlighter>
                </small>
              </h1>
              {!firstRunToken ? (
                <>
                  <Alert type="critical">{t('First run token missing')}</Alert>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <Label htmlFor="odin-id" className="text-sm leading-7  dark:text-gray-400">
                      {t('Odin id')}
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
                      {t('Password')}
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
                  <div className="mb-4">
                    <Label
                      htmlFor="retypepassword"
                      className="text-sm leading-7  dark:text-gray-400"
                    >
                      {t('Retype Password')}
                    </Label>
                    <Input
                      type="text"
                      name="retypePassword"
                      id="retypePassword"
                      required
                      onChange={(e) => setRetypePassword(e.target.value)}
                      defaultValue={retypePassword}
                    />
                    {password !== retypePassword && retypePassword !== '' ? (
                      <p className="font-semibold text-red-800 dark:text-red-200">
                        {t("Passwords don't match")}
                      </p>
                    ) : null}
                  </div>
                  <ActionButton
                    className="mt-10 w-full"
                    type="primary"
                    icon="send"
                    state={state}
                    size="large"
                  >
                    {t('Set password & login')}
                  </ActionButton>
                </>
              )}
            </form>
          </div>
        </section>
      </MinimalLayout>
    </>
  );
};

export default FirstRun;
