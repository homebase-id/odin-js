import { BuiltInAttributes } from '../../core/AttributeData/AttributeConfig';
import { getAttributeVersions } from '../../core/AttributeData/AttributeDataProvider';
import { DotYouClient } from '../../core/DotYouClient';
import { SecurityGroupType } from '../../core/DriveData/DriveUploadTypes';
import { getDecryptedImageData } from '../../core/MediaData/MediaProvider';
import { BuiltInProfiles, MinimalProfileFields } from '../../profile/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../../profile/ProfileDefinitionProvider';
import { publishProfileCardFile, publishProfileImageFile } from './FileProvider';

interface ProfileCard {
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

    const httpClient = dotYouClient.createAxiosClient(true);

    const fetchProfileCard = async () => {
      return await httpClient
        .get<ProfileCard>(`/pub/profile`, {
          baseURL: dotYouClient.getRoot(),
          withCredentials: false,
        })
        .then((response) => {
          return {
            ...response.data,
            image: `https://${dotYouClient.getHostname()}/pub/image`,
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
    ?.map((attr) => attr?.data?.[MinimalProfileFields.ProfileImageId] as string)
    .filter((fileId) => fileId !== undefined);

  if (profilePhotoFileIds?.length) {
    const imageData = await getDecryptedImageData(
      dotYouClient,
      GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId),
      profilePhotoFileIds[0],
      { pixelWidth: 300, pixelHeight: 300 }
    );
    if (imageData) {
      await publishProfileImageFile(
        dotYouClient,
        new Uint8Array(imageData.content),
        imageData.contentType
      );
    }
  }
};
