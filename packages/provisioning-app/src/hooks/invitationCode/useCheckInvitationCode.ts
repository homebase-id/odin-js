import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const root = '//' + window.location.host + '/api/registration/v1';

const useCheckInvitationCode = (code?: string) => {
  const doCheckInvitationCode = async (code: string) => {
    const response = await axios
      .get(`${root}/registration/is-valid-invitation-code/${code}`)
      .catch((err) => ({ status: err.status }));

    return response.status === 200;
  };

  return {
    checkInvitationCode: useQuery(
      ['invitation-code', code],
      () => doCheckInvitationCode(code as string),
      {
        enabled: !!code,
        retry: false,
        cacheTime: 1000 * 60 * 60, // 1 hour
        staleTime: 1000 * 60 * 60, // 1 hour
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      }
    ),
  };
};

export default useCheckInvitationCode;
