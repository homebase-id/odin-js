import { useQuery } from '@tanstack/react-query';
import {
  DotYouClient,
  getSecurityContext,
  getSecurityContextOverTransit,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

const useSecurityContext = (odinId?: string) => {
  const dotYouClient = useAuth().getDotYouClient();

  const fetch = async (odinId?: string) => {
    if (!odinId) return await getSecurityContext(dotYouClient);
    else return await getSecurityContextOverTransit(dotYouClient, odinId);
  };

  return {
    fetch: useQuery(['security-context', odinId], () => fetch(odinId), {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }),
  };
};

export default useSecurityContext;
