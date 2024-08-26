import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useYouAuthAuthorization } from '../../hooks/auth/useAuth';
import { ROOT_PATH } from '../../app/App';

const AuthFinalize = () => {
  const isRunning = useRef(false);

  const [searchParams] = useSearchParams();
  const { finalizeAuthorization } = useYouAuthAuthorization();
  const [finalizeState, setFinalizeState] = useState<undefined | 'success' | 'error'>();

  const identity = searchParams.get('identity');
  const public_key = searchParams.get('public_key');
  const salt = searchParams.get('salt');
  const returnUrl = searchParams.get('state');

  useEffect(() => {
    (async () => {
      if (!identity || !public_key || !salt) return;
      if (isRunning.current) return;

      isRunning.current = true;
      const authState = await finalizeAuthorization(identity, public_key, salt);
      setFinalizeState(authState ? 'success' : 'error');
    })();
  }, []);

  // On error redirect to the auth page; (Which might auto restart authorize process)
  if (!identity || !public_key || !salt) return <Navigate to={`${ROOT_PATH}/auth`} />;
  if (finalizeState === 'error') return <Navigate to={`${ROOT_PATH}/auth?state=finalize-error`} />;
  if (finalizeState === 'success') return <Navigate to={returnUrl || '/'} />;

  return (
    <>
      <Helmet>
        <title>Login | Homebase</title>
      </Helmet>
    </>
  );
};

export default AuthFinalize;
