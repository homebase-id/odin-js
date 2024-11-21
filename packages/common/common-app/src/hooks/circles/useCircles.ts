import { QueryClient, useQuery } from '@tanstack/react-query';
import { getCircles } from '@homebase-id/js-lib/network';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export const useCircles = (excludeSystemCircles = false) => {
  const dotYouClient = useDotYouClientContext();

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

export const invalidateCircles = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['circles'], exact: false });
};
