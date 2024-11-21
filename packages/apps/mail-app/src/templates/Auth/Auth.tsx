import { Helmet } from 'react-helmet-async';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../../components/ui/Layout/Layout';
import {
  DialogWrapper,
  Alert,
  t,
  MAIL_ROOT_PATH,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { AutoAuthorize, LoginBox } from '../../components/Auth/LoginBox/LoginBox';

const Auth = () => {
  const isAutoAuthorize = window.location.pathname.startsWith(MAIL_ROOT_PATH);

  const [searchParams] = useSearchParams();
  const isError = searchParams.get('state') === 'finalize-error';

  const isAuthenticated = useDotYouClientContext().isAuthenticated();

  if (isAuthenticated) <Navigate to="/" />;
  if (isAutoAuthorize) return <AutoAuthorize />;

  return (
    <>
      <Helmet>
        <title>Login | Homebase</title>
      </Helmet>
      <Layout noShadedBg={true} noPadding={true}>
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
