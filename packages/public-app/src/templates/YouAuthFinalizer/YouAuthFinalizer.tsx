import { useEffect } from 'react';
import { useYouAuthAuthorization } from '../../hooks/auth/useAuth';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';

const YouAuthFinalizer = () => {
  const { finalizeAuthorization } = useYouAuthAuthorization();

  const urlParams = new URLSearchParams(window.location.search);
  const result = urlParams.get('r');
  const eccInfo = urlParams.get('ecc');
  if (!result || !eccInfo) return <>ERROR!</>;

  const { pk, salt, iv } = tryJsonParse<{ pk: string; salt: string; iv: string }>(eccInfo);

  if (!result || !pk || !salt || !iv) {
    return <>ERROR!</>;
  }

  useEffect(() => {
    finalizeAuthorization(result, pk, salt, iv);
  }, []);

  return <></>;
};

export default YouAuthFinalizer;
