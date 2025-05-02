import { useMutation } from '@tanstack/react-query';
import { IntroductionGroup, sendIntroduction } from '@homebase-id/js-lib/network';
import { useOdinClientContext } from '../auth/useOdinClientContext';

export const useIntroductions = () => {
  const odinClient = useOdinClientContext();

  const introduce = async (introduction: IntroductionGroup) =>
    sendIntroduction(odinClient, introduction);

  return {
    introduceIdentities: useMutation({
      mutationFn: introduce,
      onError: (error) => {
        console.error('[useIntroductions:introduceIdentities]', error);
        // throw error;
      },
    }),
  };
};
