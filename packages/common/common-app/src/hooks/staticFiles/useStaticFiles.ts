import { useMutation } from '@tanstack/react-query';
import {
  publishProfile,
  publishProfileImage,
  publishProfileCard,
} from '@homebase-id/js-lib/public';

import { ApiType } from '@homebase-id/js-lib/core';
import { BuiltInAttributes } from '@homebase-id/js-lib/profile';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useDotYouClient } from '../auth/useDotYouClient';

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