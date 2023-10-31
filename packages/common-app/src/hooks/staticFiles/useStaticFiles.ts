import { useMutation } from '@tanstack/react-query';
import {
  publishProfile,
  publishProfileImage,
  publishProfileCard,
} from '@youfoundation/js-lib/public';
import { useDotYouClient } from '../../..';

export const useStaticFiles = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const publishData = async () => {
    console.debug('[STARTED] Static file publish');

    await Promise.all([
      await publishProfile(dotYouClient),
      await publishProfileImage(dotYouClient),
      await publishProfileCard(dotYouClient),
    ]);

    console.debug('[COMPLETEDED] Static file publish');
  };

  return {
    publish: useMutation({
      mutationFn: publishData,
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
