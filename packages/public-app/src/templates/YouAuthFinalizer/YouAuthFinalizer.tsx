import { useEffect } from 'react';
import useAuth from '../../hooks/auth/useAuth';

const YouAuthFinalizer = () => {
  const { finalizeAuthorization } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);

  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const publicKey = urlParams.get('public_key');
  const salt = urlParams.get('salt');
  const identity = urlParams.get('identity');

  if (!identity || !code || !state || !publicKey || !salt) {
    return <>ERROR!</>;
  }
  // console.log('finalize auth with', xqs.get('ss64'), xqs.get('returnUrl'));
  useEffect(() => {
    finalizeAuthorization(identity, code, state, publicKey, salt);
  }, []);

  return <></>;
};

export default YouAuthFinalizer;
