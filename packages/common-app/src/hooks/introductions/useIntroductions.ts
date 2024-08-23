import { useMutation } from '@tanstack/react-query';
import { useDotYouClient } from '../auth/useDotYouClient';
import { sendIntroduction, IntroductionGroup } from '@youfoundation/js-lib/network';

export const useIntroductions = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const introduce = async (introduction: IntroductionGroup) =>
    sendIntroduction(dotYouClient, introduction);

  return {
    introduceIdentities: useMutation({
      mutationFn: introduce,
    }),
  };
};
