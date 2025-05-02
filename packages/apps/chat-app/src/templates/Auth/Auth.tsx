import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';

import {
  DialogWrapper,
  Alert,
  t,
  useOdinClientContext,
  OWNER_APPS_ROOT,
} from '@homebase-id/common-app';
import { AutoAuthorize, LoginBox } from '../../components/Auth/LoginBox/LoginBox';
import { Layout } from '../../components/ui/Layout/Layout';
import { useEffect } from 'react';

const Auth = () => {
  const isAutoAuthorize = window.location.pathname.startsWith(OWNER_APPS_ROOT);

  const [searchParams] = useSearchParams();
  const isError = searchParams.get('state') === 'finalize-error';

  const isAuthenticated = useOdinClientContext().isAuthenticated();

  useEffect(() => {
    if (isAuthenticated) window.location.href = '/';
  }, [isAuthenticated]);
  if (isAutoAuthorize) return <AutoAuthorize />;

  return (
    <>
      <Helmet>
        <title>Login | Homebase</title>
      </Helmet>
      <Layout noShadedBg={true}>
        <DialogWrapper>
          {isError && (
            <Alert className="my-2" type="warning" isCompact={true}>
              {t('Authorization failed, please try again')}
            </Alert>
          )}
          <div className="min-w-[20rem] p-8 pt-6">
            <LoginBox />
          </div>
        </DialogWrapper>
      </Layout>
    </>
  );
};

export default Auth;
