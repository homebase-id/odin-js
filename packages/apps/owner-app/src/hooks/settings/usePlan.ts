import { useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import { getPlan } from '../../provider/system/PlanProvider';

export const usePlan = () => {
  const dotYouClient = useDotYouClientContext();

  return useQuery({
    queryKey: ['hosting-plan'],
    queryFn: () => getPlan(dotYouClient),
  });
};
