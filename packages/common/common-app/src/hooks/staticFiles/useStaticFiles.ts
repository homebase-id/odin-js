import { useMutation } from '@tanstack/react-query';
import {
  publishProfile,
  publishProfileImage,
  publishProfileCard,
  ProfileCardAttributeTypes,
} from '@homebase-id/js-lib/public';

import { ApiType } from '@homebase-id/js-lib/core';
import { BuiltInAttributes } from '@homebase-id/js-lib/profile';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useOdinClientContext } from '../auth/useOdinClientContext';

export const useStaticFiles = () => {
  const odinClient = useOdinClientContext();

  const publishData = async (dataType?: 'channel' | typeof BuiltInAttributes.Name) => {
    console.debug('[STARTED] Static file publish', dataType);

    const publishActions: Promise<unknown>[] = [publishProfile(odinClient, dataType)];

    if (odinClient.getType() === ApiType.Owner) {
      if (!dataType || stringGuidsEqual(dataType, BuiltInAttributes.Photo))
        publishActions.push(publishProfileImage(odinClient));

      if (!dataType || ProfileCardAttributeTypes.some((type) => stringGuidsEqual(dataType, type)))
        publishActions.push(publishProfileCard(odinClient));
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
