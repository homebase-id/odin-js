import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AccessControlList,
  getDecryptedImageUrl,
  ImageContentType,
  ImageSize,
  removeImage,
  SecurityGroupType,
  TargetDrive,
  ThumbnailInstruction,
  uploadImage,
} from '@youfoundation/js-lib/core';
import { getDecryptedImageUrlOverTransit } from '@youfoundation/js-lib/transit';

import { useDotYouClient } from '../../..';

export interface ImageData {
  url: string;
  naturalSize?: ImageSize;
}

export const useImage = (
  odinId?: string,
  imageFileId?: string | undefined,
  imageDrive?: TargetDrive,
  size?: ImageSize,
  probablyEncrypted?: boolean,
  naturalSize?: ImageSize
) => {
  const localHost = window.location.hostname;
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClient().getDotYouClient();

  const fetchImageData = async (
    odinId: string,
    imageFileId: string | undefined,
    imageDrive?: TargetDrive,
    size?: ImageSize,
    probablyEncrypted?: boolean,
    naturalSize?: ImageSize
  ): Promise<ImageData | undefined> => {
    if (imageFileId === undefined || imageFileId === '' || !imageDrive) return;

    const fetchDataPromise = async () => {
      return {
        url:
          odinId !== localHost
            ? await getDecryptedImageUrlOverTransit(
                dotYouClient,
                odinId,
                imageDrive,
                imageFileId,
                size
              )
            : await getDecryptedImageUrl(
                dotYouClient,
                imageDrive,
                imageFileId,
                size,
                probablyEncrypted
              ),
        naturalSize: naturalSize,
      };
    };

    return await fetchDataPromise();
  };

  const saveImageFile = async ({
    bytes,
    type,
    targetDrive,
    acl = { requiredSecurityGroup: SecurityGroupType.Anonymous },
    fileId = undefined,
    versionTag = undefined,
    thumbInstructions,
  }: {
    bytes: Uint8Array;
    type: ImageContentType;
    targetDrive: TargetDrive;
    acl?: AccessControlList;
    fileId?: string;
    versionTag?: string;
    thumbInstructions?: ThumbnailInstruction[];
  }) => {
    return await uploadImage(
      dotYouClient,
      targetDrive,
      acl,
      bytes,
      undefined,
      {
        fileId,
        versionTag,
        type,
      },
      thumbInstructions
    );
  };

  const removeImageFile = async ({
    targetDrive,
    fileId,
  }: {
    targetDrive: TargetDrive;
    fileId: string;
  }) => {
    return await removeImage(dotYouClient, fileId, targetDrive);
  };

  return {
    fetch: useQuery({
      queryKey: [
        'image',
        odinId || localHost,
        imageDrive?.alias,
        imageFileId,
        `${size?.pixelHeight}x${size?.pixelWidth}`,
      ],
      queryFn: () =>
        fetchImageData(
          odinId || localHost,
          imageFileId,
          imageDrive,
          size,
          probablyEncrypted,
          naturalSize
        ),
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      enabled: !!imageFileId && imageFileId !== '',
    }),
    save: useMutation({
      mutationFn: saveImageFile,
      onSuccess: (_data, variables) => {
        // Boom baby!
        if (variables.fileId) {
          queryClient.invalidateQueries({
            queryKey: ['image', localHost, variables.targetDrive.alias, variables.fileId],
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ['image'], exact: false });
        }
      },
    }),
    remove: useMutation({ mutationFn: removeImageFile }),
  };
};
