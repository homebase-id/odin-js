import { useQuery } from '@tanstack/react-query';
import { getCircles } from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useCircles = () => {
  const dotYouClient = useAuth().getDotYouClient();

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
