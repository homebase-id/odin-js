import { useQuery } from '@tanstack/react-query';
import { ApiType, DotYouClient, getCircles } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useCircles = () => {
  const { getSharedSecret } = useAuth();
  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

  const fetchAll = async () => {
    const circles = await getCircles(dotYouClient);
    return circles?.sort((a, b) => (a.disabled ? 1 : 0) - (b.disabled ? 1 : 0));
  };

  return {
    fetch: useQuery(['circles'], () => fetchAll(), {
      refetchOnWindowFocus: false,
    }),
  };
};

export default useCircles;
