import { useEffect } from 'react';
import { useYouAuthAuthorization } from '../../hooks/auth/useAuth';

const YouAuthFinalizer = () => {
  const { finalizeAuthorization } = useYouAuthAuthorization();

  const urlParams = new URLSearchParams(window.location.search);
  const result = urlParams.get('r');
  if (!result) return <>ERROR!</>;

  const { identity, ss64 } = JSON.parse(result);

  if (!identity || !ss64) {
    return <>ERROR!</>;
  }

  useEffect(() => {
    finalizeAuthorization(identity, ss64);
  }, []);

  return <></>;
};

export default YouAuthFinalizer;
