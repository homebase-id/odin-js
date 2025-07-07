const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;
import axios from 'axios';
import { ApiType, DotYouClient } from '../../core/DotYouClient';
import { HomebaseFile, SecurityGroupType } from '../../core/DriveData/File/DriveFileTypes';
import { getDecryptedImageData } from '../../media/ImageProvider';
import {
  BuiltInProfiles,
  EmailFields,
  getSocialLink,
  LinkFields,
  MinimalProfileFields,
} from '../../profile/ProfileData/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../../profile/ProfileData/ProfileDefinitionManager';
import { getProfileAttributes, BuiltInAttributes, Attribute } from '../../profile/profile';
import { publishProfileCardFile, publishProfileImageFile } from './FileProvider';
import { resizeImageFromBlob } from '../../media/media';

export interface ProfileCard {
  name: string;
  image: string;
}
const _internalFileCache = new Map<string, Promise<ProfileCard | undefined>>();

export const ProfileCardAttributeTypes = [
  BuiltInAttributes.Name,
  BuiltInAttributes.Email,
  BuiltInAttributes.Link,
  BuiltInAttributes.Photo,
  BuiltInAttributes.FullBio,
  BuiltInAttributes.BioSummary,
  BuiltInAttributes.Status,
  ...BuiltInAttributes.AllSocial,
  ...BuiltInAttributes.AllGames,
];

export const publishProfileCard = async (dotYouClient: DotYouClient) => {
  const profileNameAttributes = await getProfileAttributes(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    undefined,
    [BuiltInAttributes.Name]
  );

  const publicNameAttribute = profileNameAttributes?.filter(
    (attr) =>
      attr.serverMetadata?.accessControlList.requiredSecurityGroup.toLowerCase() ===
      SecurityGroupType.Anonymous.toLowerCase()
  )[0];

  const displayName = publicNameAttribute?.fileMetadata?.appData?.content?.data?.[
    MinimalProfileFields.DisplayName
  ] as string | undefined;
  const givenName = publicNameAttribute?.fileMetadata?.appData?.content?.data?.[
    MinimalProfileFields.GivenNameId
  ] as string | undefined;
  const familyName = publicNameAttribute?.fileMetadata?.appData?.content?.data?.[
    MinimalProfileFields.SurnameId
  ] as string | undefined;

  ////
  
  const statusAttributes = await getProfileAttributes(
      dotYouClient,
      BuiltInProfiles.StandardProfileId,
      undefined,
      [BuiltInAttributes.Status]
  );

  const statusAttribute = statusAttributes?.filter((attr) =>
      attr.serverMetadata?.accessControlList.requiredSecurityGroup.toLowerCase() ===
      SecurityGroupType.Anonymous.toLowerCase()
  )[0];

  const status = statusAttribute?.fileMetadata?.appData?.content?.data?.[
      MinimalProfileFields.Status
      ] as string | undefined;
  
  ////
  
  const bioAttributes = await getProfileAttributes(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    undefined,
    [BuiltInAttributes.FullBio]
  );

  const bios = bioAttributes
    ?.filter(
      (attr) =>
        attr.serverMetadata?.accessControlList.requiredSecurityGroup.toLowerCase() ===
        SecurityGroupType.Anonymous.toLowerCase()
    )
    ?.map(
      (attr) =>
        ellipsisAtMaxChar(
          getPlainTextFromRichText(
            attr?.fileMetadata?.appData?.content?.data?.[MinimalProfileFields.BioId] as string
          ),
          260
        ) || ''
    )
    .filter((data) => data !== undefined);
  
  const bioSummaryAttributes = await getProfileAttributes(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    undefined,
    [BuiltInAttributes.BioSummary]
  );

  const bioSummaries = bioSummaryAttributes
    ?.filter(
      (attr) =>
        attr.serverMetadata?.accessControlList.requiredSecurityGroup.toLowerCase() ===
        SecurityGroupType.Anonymous.toLowerCase()
    )
    ?.map(
      (attr) =>
        ellipsisAtMaxChar(
          getPlainTextFromRichText(
            attr?.fileMetadata?.appData?.content?.data?.[MinimalProfileFields.BioId] as string
          ),
          260
        ) || ''
    )
    .filter((data) => data !== undefined);

  const emailAttributes = await getProfileAttributes(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    undefined,
    [BuiltInAttributes.Email]
  );

  const emails = emailAttributes
    ?.filter(
      (attr) =>
        attr.serverMetadata?.accessControlList.requiredSecurityGroup.toLowerCase() ===
        SecurityGroupType.Anonymous.toLowerCase()
    )
    ?.map((attr) => ({
      type: attr?.fileMetadata?.appData?.content?.data?.[EmailFields.Label] || '',
      email: attr?.fileMetadata?.appData?.content?.data?.[EmailFields.Email] || '',
    }))
    .filter((email) => email.type && email.email);

  const socialAttributes = await getProfileAttributes(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    undefined,
    [...BuiltInAttributes.AllSocial, ...BuiltInAttributes.AllGames]
  );
  const socials = socialAttributes
    ?.filter(
      (attr) =>
        attr.serverMetadata?.accessControlList.requiredSecurityGroup.toLowerCase() ===
        SecurityGroupType.Anonymous.toLowerCase()
    )
    .map((attr) => {
      const type = Object.keys(attr.fileMetadata.appData.content.data || {})?.[0];
      const value = attr.fileMetadata.appData.content.data?.[type];

      return {
        type: type,
        url: getSocialLink(type, value),
      };
    })
    .filter((link) => link.type && link.url);

  const linkAttributes = await getProfileAttributes(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    undefined,
    [BuiltInAttributes.Link]
  );

  const links = linkAttributes
    ?.filter(
      (attr) =>
        attr.serverMetadata?.accessControlList.requiredSecurityGroup.toLowerCase() ===
        SecurityGroupType.Anonymous.toLowerCase()
    )
    .map((attr) => ({
      type: attr.fileMetadata.appData.content.data?.[LinkFields.LinkText],
      url: attr.fileMetadata.appData.content.data?.[LinkFields.LinkTarget],
    }))
    .filter((link) => link.type && link.url);

  await publishProfileCardFile(dotYouClient, {
    name: displayName || dotYouClient.getHostIdentity(),
    givenName: (givenName?.length && givenName) || undefined,
    familyName: (familyName?.length && familyName) || undefined,
    status: (status?.length && status) || undefined,
    bio: bios?.[0] || '',
    bioSummary: bioSummaries?.[0] || '',
    image: `https://${dotYouClient.getHostIdentity()}/pub/image`,
    email: emails,
    links: [...socials, ...links],
    sameAs: [...socials]
  });
};

export const GetProfileCard = async (odinId: string): Promise<ProfileCard | undefined> => {
  try {
    if (_internalFileCache.has(odinId)) {
      return await _internalFileCache.get(odinId);
    }

    const host = new DotYouClient({ hostIdentity: odinId, api: ApiType.Guest }).getRoot();

    const httpClient = axios.create();
    const fetchProfileCard = async () => {
      return await httpClient
        .get<ProfileCard>(`${host}/pub/profile`, {
          withCredentials: false,
        })
        .then((response) => {
          return {
            ...response.data,
            image: `${host}/pub/image`,
          };
        });
    };

    const promise = fetchProfileCard();
    _internalFileCache.set(odinId, promise);

    return await promise;
  } catch {
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
        const resizedJpgData = await resizeImageFromBlob(
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
      } catch {
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
      const host = new DotYouClient({ hostIdentity: odinId, api: ApiType.Guest }).getRoot();

      return await httpClient
        .get(`${host}/pub/image`, {
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
  } catch {
    console.warn(`Fetching 'profileimage' failed`);
    return;
  }
};

const getTextRootsRecursive = (
  children: { children?: unknown; text?: string; value?: string }[] | string | undefined,
  keepNewLines?: boolean
): string[] => {
  if (!children) return [];
  if (!Array.isArray(children)) return [children as string];

  return children
    .map(
      (child) =>
        [
          child.children
            ? getTextRootsRecursive(
              child.children as { children?: unknown; text?: string; value?: string }[]
            ).join(keepNewLines ? '\n' : ' ')
            : undefined,
          (child.text || child.value || undefined) as string,
        ]
          .filter(Boolean)
          .join(' ') || ''
    )
    .filter((child) => child.length);
};

const getPlainTextFromRichText = (
  message: string | { children?: unknown; text?: string; value?: string }[] | undefined,
  keepNewLines?: boolean
) => {
  if (!message) return undefined;
  return getTextRootsRecursive(message, keepNewLines).join(keepNewLines ? '\n' : ' ');
};

const ellipsisAtMaxChar = (str: string | undefined, maxChar?: number) => {
  if (!str || !maxChar) {
    return str;
  }

  if (str.length <= maxChar) {
    return str;
  }

  return `${str.substring(0, maxChar)}...`;
};
