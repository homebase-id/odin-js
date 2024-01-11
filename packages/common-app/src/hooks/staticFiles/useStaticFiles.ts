import { useMutation } from '@tanstack/react-query';
import {
  publishProfile,
  publishProfileImage,
  publishProfileCard,
} from '@youfoundation/js-lib/public';
import { useDotYouClient } from '../../..';
import { ApiType } from '@youfoundation/js-lib/core';

export const useStaticFiles = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const publishData = async () => {
    console.debug('[STARTED] Static file publish');

    const publishActions: Promise<unknown>[] = [publishProfile(dotYouClient)];

    if (dotYouClient.getType() === ApiType.Owner) {
      publishActions.push(publishProfileImage(dotYouClient));
      publishActions.push(publishProfileCard(dotYouClient));
    }

    await Promise.all(publishActions);

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
