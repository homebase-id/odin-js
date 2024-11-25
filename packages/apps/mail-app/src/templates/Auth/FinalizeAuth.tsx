import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useYouAuthAuthorization } from '../../hooks/auth/useAuth';
import { MAIL_ROOT_PATH } from '@homebase-id/common-app';

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
  if (!identity || !public_key || !salt) return <Navigate to={`${MAIL_ROOT_PATH}/auth`} />;
  if (finalizeState === 'error')
    return <Navigate to={`${MAIL_ROOT_PATH}/auth?state=finalize-error`} />;

  useEffect(() => {
    if (finalizeState === 'success') {
      window.location.href = returnUrl || '/';
    }
  }, [finalizeState]);

  return (
    <>
      <Helmet>
        <title>Login | Homebase</title>
      </Helmet>
    </>
  );
};

export default AuthFinalize;
