import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const root = '/api/registration/v1';

export const useConfiguration = () => {
  const fetchConfiguration = async () => {
    const response = await axios
      .get<boolean>(root + `/registration/is-invitation-code-needed`)
      .then((response) => response.data);

    return { invitationCodeEnabled: response };
  };

  return useQuery({
    queryKey: ['configuration'],
    queryFn: fetchConfiguration,
    staleTime: 1000 * 60 * 60 * 24, // 1 day
  });
};
