import useAuth from '../../hooks/auth/useAuth';

const YouAuthFinalizer = () => {
  const { finalizeAuthentication } = useAuth();

  const xqs = new URLSearchParams(window.location.search);
  console.log('finalize auth with', xqs.get('ss64'), xqs.get('returnUrl'));
  finalizeAuthentication(xqs.get('ss64'), xqs.get('returnUrl'));

  return <></>;
};

export default YouAuthFinalizer;
