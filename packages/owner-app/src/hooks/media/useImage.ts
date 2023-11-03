import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AccessControlList,
  getDecryptedImageUrl,
  removeImage,
  SecurityGroupType,
  TargetDrive,
  uploadImage,
} from '@youfoundation/js-lib/core';
import { useAuth } from '../auth/useAuth';
import { BlogConfig } from '@youfoundation/js-lib/public';

const defaultDrive: TargetDrive = BlogConfig.PublicChannelDrive;

export const useImage = (imageFileId?: string, imageFileKey?: string, imageDrive?: TargetDrive) => {
  const dotYouClient = useAuth().getDotYouClient();

  const queryClient = useQueryClient();

  const fetchImageData = async (
    imageFileId: string,
    imageFileKey: string,
    imageDrive?: TargetDrive
  ) => {
    try {
      return await getDecryptedImageUrl(
        dotYouClient,
        imageDrive ?? defaultDrive,
        imageFileId,
        imageFileKey
      );
    } catch (ex) {
      throw new Error('failed to get imageData');
    }
  };

  const saveImage = async ({
    image,
    targetDrive = defaultDrive,
    acl = { requiredSecurityGroup: SecurityGroupType.Anonymous },
    fileId = undefined,
    versionTag = undefined,
  }: {
    image: Blob;
    targetDrive: TargetDrive;
    acl?: AccessControlList;
    fileId?: string;
    versionTag?: string;
  }) => {
    return await uploadImage(dotYouClient, targetDrive, acl, image, undefined, {
      fileId: fileId,
      versionTag: versionTag,
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
    fetch: useQuery({
      queryKey: ['image', imageFileId, imageDrive?.alias],
      queryFn: () => fetchImageData(imageFileId as string, imageFileKey as string, imageDrive),

      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!imageFileId && !!imageFileKey,
    }),
    save: useMutation({
      mutationFn: saveImage,
      onSuccess: (_data, variables) => {
        // Boom baby!
        if (variables.fileId) {
          queryClient.invalidateQueries({
            queryKey: ['image', variables.fileId, variables.targetDrive ?? defaultDrive],
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ['image'], exact: false });
        }
      },
    }),
    remove: useMutation({ mutationFn: removeImageInternal }),
    // The remove mutation doesn't force invalidate the cache anymore, as removing an image always corresponds to removing the refrence as well.
  };
};
