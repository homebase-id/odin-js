import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AccessControlList,
  DotYouClient,
  getDecryptedImageUrl,
  getDecryptedImageUrlOverTransit,
  ImageContentType,
  ImageSize,
  removeImage,
  SecurityGroupType,
  TargetDrive,
  uploadImage,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';

interface ImageData {
  url: string;
  naturalSize?: ImageSize;
}

const useImage = (
  odinId?: string,
  imageFileId?: string | undefined,
  imageDrive?: TargetDrive,
  size?: ImageSize,
  probablyEncrypted?: boolean,
  naturalSize?: ImageSize
) => {
  const localHost = window.location.hostname;
  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();

  const fetchImageData = async (
    odinId: string,
    imageFileId: string | undefined,
    imageDrive?: TargetDrive,
    size?: ImageSize,
    probablyEncrypted?: boolean,
    naturalSize?: ImageSize
  ): Promise<ImageData | undefined> => {
    if (imageFileId === undefined || imageFileId === '' || !imageDrive) {
      return;
    }

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
  }: {
    bytes: Uint8Array;
    type: ImageContentType;
    targetDrive: TargetDrive;
    acl?: AccessControlList;
    fileId?: string;
    versionTag?: string;
  }) => {
    return await uploadImage(dotYouClient, targetDrive, acl, bytes, undefined, {
      fileId,
      versionTag,
      type,
    });
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
    fetch: useQuery(
      [
        'image',
        odinId || localHost,
        imageDrive?.alias,
        imageFileId,
        `${size?.pixelHeight}x${size?.pixelWidth}`,
      ],
      () =>
        fetchImageData(
          odinId || localHost,
          imageFileId,
          imageDrive,
          size,
          probablyEncrypted,
          naturalSize
        ),
      {
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
        enabled: !!imageFileId && imageFileId !== '',
      }
    ),
    getFromCache: (odinId: string | undefined, imageFileId: string, imageDrive: TargetDrive) => {
      const existingKeys = queryClient
        .getQueryCache()
        .findAll(['image', odinId || localHost, imageDrive?.alias, imageFileId], { exact: false })
        .filter((query) => query.state.status === 'success');

      if (existingKeys?.length)
        return queryClient.getQueryData<ImageData | undefined>(existingKeys[0].queryKey);
    },
    save: useMutation(saveImageFile, {
      onSuccess: (_data, variables) => {
        // Boom baby!
        if (variables.fileId) {
          queryClient.invalidateQueries([
            'image',
            localHost,
            variables.targetDrive.alias,
            variables.fileId,
          ]);
        } else {
          queryClient.removeQueries(['image']);
        }
      },
    }),
    remove: useMutation(removeImageFile),
  };
};

export default useImage;
