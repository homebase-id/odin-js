import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/ui/Layout/Layout';
import useAuth from '../../hooks/auth/useAuth';
// import PhotoLibraryLoader from '../../components/Photos/PhotoLibraryLoader/PhotoLibraryLoader';

const AuthFinalize = () => {
  const [searchParams] = useSearchParams();
  const { finalizeAuthentication } = useAuth();
  const [state, setState] = useState<undefined | 'success' | 'error'>();

  const data = decodeURIComponent(searchParams.get('d') || '');
  const v = decodeURIComponent(searchParams.get('v') || '');
  const id = decodeURIComponent(searchParams.get('id') || '');
  const returnUrl = decodeURIComponent(searchParams.get('returnUrl') || '');

  useEffect(() => {
    (async () => {
      const authState = await finalizeAuthentication(data, v, id);
      setState(authState ? 'success' : 'error');
    })();
  }, []);

  if (!data?.length || !v?.length) {
    return <Navigate to={'/auth'} />;
  }

  if (state === 'success') {
    return <Navigate to={returnUrl} />;
  }

  if (state === 'error') {
    return <Navigate to={'/auth?state=finalize-error'} />;
  }

  return (
    <>
      <Helmet>
        <title>Login | Odin</title>
      </Helmet>
      <div className="cursor-wait ">
        <div className="pointer-events-none ">
          <Layout noShadedBg={true} noPadding={true}>
            {/* <PhotoLibraryLoader className="h-screen overflow-hidden px-2 py-2 pt-4 sm:px-10 sm:pt-8" /> */}
          </Layout>
        </div>
      </div>
    </>
  );
};

export default AuthFinalize;
