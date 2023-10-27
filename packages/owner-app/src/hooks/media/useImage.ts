import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AccessControlList,
  getDecryptedImageUrl,
  ImageContentType,
  removeImage,
  SecurityGroupType,
  TargetDrive,
  uploadImage,
} from '@youfoundation/js-lib/core';
import { useAuth } from '../auth/useAuth';
import { BlogConfig } from '@youfoundation/js-lib/public';

const defaultDrive: TargetDrive = BlogConfig.PublicChannelDrive;

export const useImage = (imageFileId?: string, imageDrive?: TargetDrive) => {
  const dotYouClient = useAuth().getDotYouClient();

  const queryClient = useQueryClient();

  const fetchImageData = async (imageFileId: string, imageDrive?: TargetDrive) => {
    try {
      return await getDecryptedImageUrl(dotYouClient, imageDrive ?? defaultDrive, imageFileId);
    } catch (ex) {
      throw new Error('failed to get imageData');
    }
  };

  const saveImage = async ({
    bytes,
    type,
    targetDrive = defaultDrive,
    acl = { requiredSecurityGroup: SecurityGroupType.Anonymous },
    fileId = undefined,
    versionTag = undefined,
  }: {
    bytes: Uint8Array;
    type: ImageContentType;
    targetDrive: TargetDrive;
    acl?: AccessControlList;
    fileId?: string;
    versionTag?: string;
  }) => {
    return await uploadImage(dotYouClient, targetDrive, acl, bytes, undefined, {
      fileId: fileId,
      versionTag: versionTag,
      type: type,
    });
  };

  const removeImageInternal = async ({
    targetDrive = defaultDrive,
    fileId,
  }: {
    targetDrive: TargetDrive;
    fileId: string;
  }) => {
    return await removeImage(dotYouClient, fileId, targetDrive);
  };

  return {
    fetch: useQuery(
      ['image', imageFileId, imageDrive?.alias],
      () => fetchImageData(imageFileId as string, imageDrive),
      {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        enabled: !!imageFileId,
      }
    ),
    save: useMutation(saveImage, {
      onSuccess: (_data, variables) => {
        // Boom baby!
        if (variables.fileId) {
          queryClient.invalidateQueries([
            'image',
            variables.fileId,
            variables.targetDrive ?? defaultDrive,
          ]);
        } else {
          queryClient.removeQueries(['image']);
        }
      },
    }),
    remove: useMutation(removeImageInternal),
    // The remove mutation doesn't force invalidate the cache anymore, as removing an image always corresponds to removing the refrence as well.
  };
};
