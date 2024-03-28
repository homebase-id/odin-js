import { useMutation } from '@tanstack/react-query';
import {
  publishProfile,
  publishProfileImage,
  publishProfileCard,
} from '@youfoundation/js-lib/public';
import { useDotYouClient } from '../../..';
import { ApiType } from '@youfoundation/js-lib/core';
import { BuiltInAttributes } from '@youfoundation/js-lib/profile';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

export const useStaticFiles = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const publishData = async (dataType?: 'channel' | typeof BuiltInAttributes.Name) => {
    console.debug('[STARTED] Static file publish', dataType);

    const publishActions: Promise<unknown>[] = [publishProfile(dotYouClient, dataType)];

    if (dotYouClient.getType() === ApiType.Owner) {
      if (!dataType || stringGuidsEqual(dataType, BuiltInAttributes.Photo))
        publishActions.push(publishProfileImage(dotYouClient));

      if (!dataType || stringGuidsEqual(dataType, BuiltInAttributes.Name))
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
