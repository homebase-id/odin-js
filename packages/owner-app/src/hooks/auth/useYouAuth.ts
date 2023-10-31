import { useMutation } from '@tanstack/react-query';
import { createHomeToken } from '../../provider/auth/YouAuthProvider';

export const useYouAuth = () => {
  return {
    homeToken: useMutation({
      mutationFn: createHomeToken,
      onError: (err) => {
        console.error(err);
      },
    }),
  };
};
