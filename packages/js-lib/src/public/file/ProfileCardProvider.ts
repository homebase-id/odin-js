import { DotYouClient } from '../../core/DotYouClient';
import { SecurityGroupType } from '../../core/DriveData/Upload/DriveUploadTypes';
import { DEFAULT_PAYLOAD_KEY } from '../../core/DriveData/Upload/UploadHelpers';
import { getDecryptedImageData } from '../../core/MediaData/ImageProvider';
import { BuiltInProfiles, MinimalProfileFields } from '../../profile/ProfileData/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../../profile/ProfileData/ProfileDefinitionProvider';
import { getAttributeVersions, BuiltInAttributes, AttributeFile } from '../../profile/profile';
import { publishProfileCardFile, publishProfileImageFile } from './FileProvider';

export interface ProfileCard {
  name: string;
  image: string;
}
const _internalFileCache = new Map<string, Promise<ProfileCard | undefined>>();

export const publishProfileCard = async (dotYouClient: DotYouClient) => {
  const profileNameAttributes = await getAttributeVersions(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    BuiltInProfiles.PersonalInfoSectionId,
    [BuiltInAttributes.Name]
  );

  const displayNames = profileNameAttributes
    ?.filter(
      (attr) =>
        attr.acl.requiredSecurityGroup.toLowerCase() === SecurityGroupType.Anonymous.toLowerCase()
    )
    ?.map((attr) => attr?.data?.[MinimalProfileFields.DisplayName] as string)
    .filter((fileId) => fileId !== undefined);

  if (displayNames?.length) {
    await publishProfileCardFile(dotYouClient, { name: displayNames[0] });
  }
};

export const GetProfileCard = async (
  dotYouClient: DotYouClient
): Promise<ProfileCard | undefined> => {
  try {
    if (_internalFileCache.has(dotYouClient.getRoot())) {
      return await _internalFileCache.get(dotYouClient.getRoot());
    }

    const httpClient = dotYouClient.createAxiosClient({ overrideEncryption: true });

    const fetchProfileCard = async () => {
      return await httpClient
        .get<ProfileCard>(`/pub/profile`, {
          baseURL: dotYouClient.getRoot(),
          withCredentials: false,
        })
        .then((response) => {
          return {
            ...response.data,
            image: `https://${dotYouClient.getIdentity()}/pub/image`,
          };
        });
    };

    const promise = fetchProfileCard();
    _internalFileCache.set(dotYouClient.getRoot(), promise);

    return await promise;
  } catch (ex) {
    console.warn(`Fetching 'profilecard' failed`);
    return;
  }
};

export const publishProfileImage = async (dotYouClient: DotYouClient) => {
  const profilePhotoAttributes = await getAttributeVersions(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    BuiltInProfiles.PersonalInfoSectionId,
    [BuiltInAttributes.Photo]
  );

  const profilePhotoFileIds = profilePhotoAttributes
    ?.filter(
      (attr) =>
        attr.acl.requiredSecurityGroup.toLowerCase() === SecurityGroupType.Anonymous.toLowerCase()
    )
    ?.filter((dsr) => dsr && dsr.fileId !== undefined) as AttributeFile[];

  if (profilePhotoFileIds?.length) {
    const imageData = await getDecryptedImageData(
      dotYouClient,
      GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId),
      profilePhotoFileIds[0].fileId as string,
      profilePhotoFileIds[0].data[MinimalProfileFields.ProfileImageId],
      { pixelWidth: 250, pixelHeight: 250 }
    );
    if (imageData) {
      await publishProfileImageFile(
        dotYouClient,
        new Uint8Array(imageData.bytes),
        imageData.contentType
      );
    }
  }
};
