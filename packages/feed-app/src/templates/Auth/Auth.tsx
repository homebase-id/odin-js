import { Helmet } from 'react-helmet-async';
import { Navigate, useSearchParams } from 'react-router-dom';
import { t } from '../../helpers/i18n/dictionary';
import useAuth from '../../hooks/auth/useAuth';
import Layout from '../../components/ui/Layout/Layout';
import DialogWrapper from '../../components/ui/Dialog/DialogWrapper';
import Alert from '../../components/ui/Alerts/Alert/Alert';
import { LoginBox } from '../../components/Auth/LoginBox/LoginBox';
import PhotoLibraryLoader from '../../components/Photos/PhotoLibraryLoader/PhotoLibraryLoader';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isError = searchParams.get('state') === 'finalize-error';

  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    <Navigate to="/" />;
  }

  return (
    <>
      <Helmet>
        <title>Login | Odin</title>
      </Helmet>
      <Layout noShadedBg={true} noPadding={true}>
        <PhotoLibraryLoader className="h-screen overflow-hidden px-2 py-2 pt-4 sm:px-10 sm:pt-8" />
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
