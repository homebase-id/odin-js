const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && (window as any)?.CustomBlob) || Blob;
import { DotYouClient } from '../../core/DotYouClient';
import { HomebaseFile, SecurityGroupType } from '../../core/DriveData/File/DriveFileTypes';
import { getDecryptedImageData } from '../../media/ImageProvider';
import { BuiltInProfiles, MinimalProfileFields } from '../../profile/ProfileData/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../../profile/ProfileData/ProfileDefinitionProvider';
import { getAttributeVersions, BuiltInAttributes, Attribute } from '../../profile/profile';
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
      await publishProfileImageFile(
        dotYouClient,
        new Uint8Array(imageData.bytes),
        imageData.contentType
      );
    }
  }
};

export const GetProfileImage = async (dotYouClient: DotYouClient): Promise<Blob | undefined> => {
  try {
    const httpClient = dotYouClient.createAxiosClient({ overrideEncryption: true });

    const fetchProfileCard = async () => {
      return await httpClient
        .get(`/pub/image`, {
          baseURL: dotYouClient.getRoot(),
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
