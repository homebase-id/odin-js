const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;
import axios from 'axios';
import { DotYouClient } from '../../core/DotYouClient';
import { HomebaseFile, SecurityGroupType } from '../../core/DriveData/File/DriveFileTypes';
import { getDecryptedImageData } from '../../media/ImageProvider';
import { BuiltInProfiles, MinimalProfileFields } from '../../profile/ProfileData/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../../profile/ProfileData/ProfileDefinitionProvider';
import { getProfileAttributes, BuiltInAttributes, Attribute } from '../../profile/profile';
import { publishProfileCardFile, publishProfileImageFile } from './FileProvider';
import { fromBlob } from '../../media/media';

export interface ProfileCard {
  name: string;
  image: string;
}
const _internalFileCache = new Map<string, Promise<ProfileCard | undefined>>();

export const publishProfileCard = async (dotYouClient: DotYouClient) => {
  const profileNameAttributes = await getProfileAttributes(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    BuiltInProfiles.PersonalInfoSectionId,
    [BuiltInAttributes.Name]
  );

  const displayNames = profileNameAttributes
    ?.filter(
      (attr) =>
        attr.serverMetadata?.accessControlList.requiredSecurityGroup.toLowerCase() ===
        SecurityGroupType.Anonymous.toLowerCase()
    )
    ?.map(
      (attr) =>
        attr?.fileMetadata?.appData?.content?.data?.[MinimalProfileFields.DisplayName] as string
    )
    .filter((fileId) => fileId !== undefined);

  if (displayNames?.length) await publishProfileCardFile(dotYouClient, { name: displayNames[0] });
};

export const GetProfileCard = async (odinId: string): Promise<ProfileCard | undefined> => {
  try {
    if (_internalFileCache.has(odinId)) {
      return await _internalFileCache.get(odinId);
    }

    const httpClient = axios.create();
    const fetchProfileCard = async () => {
      return await httpClient
        .get<ProfileCard>(`https://${odinId}/pub/profile`, {
          withCredentials: false,
        })
        .then((response) => {
          return {
            ...response.data,
            image: `https://${odinId}/pub/image`,
          };
        });
    };

    const promise = fetchProfileCard();
    _internalFileCache.set(odinId, promise);

    return await promise;
  } catch (ex) {
    console.warn(`Fetching 'profilecard' failed`);
    return;
  }
};

export const publishProfileImage = async (dotYouClient: DotYouClient) => {
  const profilePhotoAttributes = await getProfileAttributes(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    BuiltInProfiles.PersonalInfoSectionId,
    [BuiltInAttributes.Photo]
  );

  const publicProfilePhotoAttr = profilePhotoAttributes?.find(
    (attr) =>
      attr.serverMetadata?.accessControlList?.requiredSecurityGroup.toLowerCase() ===
        SecurityGroupType.Anonymous.toLowerCase() && attr.fileId !== undefined
  ) as HomebaseFile<Attribute> | undefined;

  if (publicProfilePhotoAttr) {
    const size = { pixelWidth: 250, pixelHeight: 250 };
    const fileKey =
      publicProfilePhotoAttr.fileMetadata.appData.content.data?.[
        MinimalProfileFields.ProfileImageKey
      ];

    const payloadIsAnSvg =
      publicProfilePhotoAttr.fileMetadata.payloads?.find((payload) => payload.key === fileKey)
        ?.contentType === 'image/svg+xml';

    const imageData = await getDecryptedImageData(
      dotYouClient,
      GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId),
      publicProfilePhotoAttr.fileId as string,
      fileKey,
      payloadIsAnSvg ? undefined : size
    );
    if (imageData) {
      try {
        const imageBlobData = new OdinBlob([new Uint8Array(imageData.bytes)], {
          type: imageData.contentType,
        });
        const resizedJpgData = await fromBlob(
          imageBlobData,
          100,
          size.pixelWidth,
          size.pixelHeight,
          'jpeg'
        );

        await publishProfileImageFile(
          dotYouClient,
          new Uint8Array(await resizedJpgData.blob.arrayBuffer()),
          resizedJpgData.blob.type
        );
      } catch (ex) {
        // Fallback to unresized image
        await publishProfileImageFile(
          dotYouClient,
          new Uint8Array(imageData.bytes),
          imageData.contentType
        );
      }
    }
  }
};

export const GetProfileImage = async (odinId: string): Promise<Blob | undefined> => {
  try {
    const httpClient = axios.create();
    const fetchProfileCard = async () => {
      return await httpClient
        .get(`https://${odinId}/pub/image`, {
          baseURL: odinId,
          withCredentials: false,
          responseType: 'arraybuffer',
        })
        .then(
          (response) =>
            new OdinBlob([new Uint8Array(Buffer.from(response.data, 'binary'))], {
              type: (response.headers['Content-Type'] as string) || 'image/webp',
            })
        );
    };

    const promise = fetchProfileCard();

    return await promise;
  } catch (ex) {
    console.warn(`Fetching 'profileimage' failed`);
    return;
  }
};
