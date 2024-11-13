import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useConfiguration } from '../configuration/useConfiguration';

const root = '//' + window.location.host + '/api/registration/v1';

export const useCheckInvitationCode = (code?: string) => {
  const { data: config, isFetched: configFetched } = useConfiguration();

  const doCheckInvitationCode = async (code: string) => {
    if (config?.invitationCodeEnabled === false) return true;

    if (!code) return false;

    const response = await axios
      .get(`${root}/registration/is-valid-invitation-code/${code}`)
      .catch((err) => ({ status: err.status }));

    return response.status === 200;
  };

  return {
    checkInvitationCode: useQuery({
      queryKey: ['invitation-code', code],
      queryFn: () => doCheckInvitationCode(code as string),
      enabled: configFetched,
      retry: false,
      gcTime: 1000 * 60 * 60, // 1 hour
      staleTime: 1000 * 60 * 60, // 1 hour
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }),
  };
};
