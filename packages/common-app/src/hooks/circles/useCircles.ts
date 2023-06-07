import { useQuery } from '@tanstack/react-query';
import { getCircles } from '@youfoundation/js-lib/network';
import { useDotYouClient } from '../../..';

export const useCircles = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

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
