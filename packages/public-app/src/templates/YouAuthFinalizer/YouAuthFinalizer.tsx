import { useEffect } from 'react';
import useAuth from '../../hooks/auth/useAuth';

const YouAuthFinalizer = () => {
  const { finalizeAuthorization } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const result = urlParams.get('r');
  if (!result) {
    return <>ERROR!</>;
  }
  const { identity, ss64 } = JSON.parse(result);

  if (!identity || !ss64) {
    return <>ERROR!</>;
  }
  // console.log('finalize auth with', xqs.get('ss64'), xqs.get('returnUrl'));
  useEffect(() => {
    finalizeAuthorization(identity, ss64);
  }, []);

  return <></>;
};

export default YouAuthFinalizer;
