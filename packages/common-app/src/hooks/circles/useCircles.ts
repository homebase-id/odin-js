import { useQuery } from '@tanstack/react-query';
import { getCircles } from '@youfoundation/js-lib/network';
import { useDotYouClient } from '../auth/useDotYouClient';

export const useCircles = (excludeSystemCircles = false) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchAll = async () => {
    const circles = await getCircles(dotYouClient, excludeSystemCircles);
    return circles?.sort((a, b) => (a.disabled ? 1 : 0) - (b.disabled ? 1 : 0));
  };

  return {
    fetch: useQuery({
      queryKey: ['circles', excludeSystemCircles],
      queryFn: () => fetchAll(),
      refetchOnWindowFocus: false,
    }),
  };
};
