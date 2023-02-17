import { BuiltInAttributes } from '../../core/AttributeData/AttributeConfig';
import {
  getAttributes,
  getAttributeVersions,
} from '../../core/AttributeData/AttributeDataProvider';
import { DotYouClient } from '../../core/DotYouClient';
import { getFileHeader } from '../../core/DriveData/DriveProvider';
import { FileQueryParams } from '../../core/DriveData/DriveTypes';
import { SecurityGroupType } from '../../core/DriveData/DriveUploadTypes';
import { getDecryptedImageData } from '../../core/MediaData/MediaProvider';
import { BuiltInProfiles } from '../../profile/ProfileConfig';
import { GetTargetDriveFromProfileId } from '../../profile/ProfileDefinitionProvider';
import {
  getChannelDefinitions,
  getChannelDrive,
  GetTargetDriveFromChannelId,
} from '../posts/PostDefinitionProvider';
import { getRecentPosts } from '../posts/PostProvider';
import { BlogConfig } from '../posts/PostTypes';
import { HomePageConfig, HomePageAttributes, HomePageFields } from '../home/HomeTypes';
import { DEFAULT_SECTIONS, DEFAULT_PUBLIC_SECTIONS, BASE_RESULT_OPTIONS } from './FileBase';
import { publishFile, publishProfileImageFile, QueryParamsSection } from './FileProvider';

export const publishProfile = async (dotYouClient: DotYouClient) => {
  const sections = [...DEFAULT_SECTIONS];
  const publicSections = [...DEFAULT_PUBLIC_SECTIONS];

  const homeAtrributes = await getAttributes(
    dotYouClient,
    HomePageConfig.DefaultDriveId,
    [HomePageAttributes.HomePage],
    10
  );

  // Image fileId's discovery:
  const homeFileId = homeAtrributes?.[0]?.data[HomePageFields.HeaderImageId];
  if (homeFileId) {
    try {
      const homeTargetDrive = GetTargetDriveFromProfileId(HomePageConfig.DefaultDriveId.toString());

      const imageFileHeader = await getFileHeader(dotYouClient, homeTargetDrive, homeFileId);
      const uniqueId = imageFileHeader.fileMetadata.appData.uniqueId;

      const headerImageQueryParam: FileQueryParams = {
        targetDrive: homeTargetDrive,
        fileType: [0],
      };

      if (uniqueId) {
        headerImageQueryParam.clientUniqueIdAtLeastOne = [uniqueId];
      }

      sections.push({
        name: homeFileId,
        queryParams: headerImageQueryParam,
        resultOptions: BASE_RESULT_OPTIONS,
      });
    } catch (ex) {
      console.log('No header images found => none published');
    }
  }

  const profileAttributes = await getAttributeVersions(
    dotYouClient,
    BuiltInProfiles.StandardProfileId,
    BuiltInProfiles.PersonalInfoSectionId,
    [BuiltInAttributes.Photo]
  );

  const profilePhotoFileIds = profileAttributes
    ?.filter(
      (attr) =>
        attr.acl.requiredSecurityGroup.toLowerCase() === SecurityGroupType.Anonymous.toLowerCase()
    )
    ?.map((attr) => attr?.data?.['profileImageId'] as string)
    .filter((fileId) => fileId !== undefined);

  if (profilePhotoFileIds?.length) {
    try {
      // We only use the first public profile photo id
      const profilePhotoFileId = profilePhotoFileIds[0];

      const profileTargetDrive = GetTargetDriveFromProfileId(
        BuiltInProfiles.StandardProfileId.toString()
      );

      const imageFileHeader = await getFileHeader(
        dotYouClient,
        profileTargetDrive,
        profilePhotoFileId
      );
      const uniqueId = imageFileHeader.fileMetadata.appData.uniqueId;

      const profilePhotoQueryParams: FileQueryParams = {
        targetDrive: profileTargetDrive,
        fileType: [0],
      };

      if (uniqueId) {
        profilePhotoQueryParams.clientUniqueIdAtLeastOne = [uniqueId];
      }

      // Only add first anonymous picture into the siteData;
      sections.push({
        name: profilePhotoFileId,
        queryParams: profilePhotoQueryParams,
        resultOptions: BASE_RESULT_OPTIONS,
      });

      publicSections.push({
        name: profilePhotoFileId,
        queryParams: profilePhotoQueryParams,
        resultOptions: {
          ...BASE_RESULT_OPTIONS,
          includeAdditionalThumbnails: true,
        },
      });
    } catch (ex) {
      console.log('No profile photos found => none published');
    }
  }

  return await Promise.all([
    await publishFile(dotYouClient, 'sitedata.json', sections),
    await publishFile(dotYouClient, 'public.json', publicSections, 'allowAllOrigins'),
  ]);
};

export const publishBlog = async (dotYouClient: DotYouClient) => {
  const channels = await getChannelDefinitions(dotYouClient);
  const sections = channels.map((channel) => {
    const channelDrive = getChannelDrive(channel.channelId);
    const blogOnChannelQuery: FileQueryParams = {
      targetDrive: channelDrive,
      fileType: [BlogConfig.PostFileType, BlogConfig.ChannelDefinitionFileType],
    };
    return {
      name: channel.channelId,
      queryParams: blogOnChannelQuery,
      resultOptions: BASE_RESULT_OPTIONS,
    };
  });

  const imageSections = (
    await Promise.all(
      (
        await getRecentPosts(dotYouClient, undefined, false, undefined, channels.length * 6)
      ).results
        .filter(
          (blog) =>
            blog?.acl?.requiredSecurityGroup.toLowerCase() !== SecurityGroupType.Owner.toLowerCase()
        )
        .map(async (blog) => {
          try {
            const targetDrive = GetTargetDriveFromChannelId(blog.content.channelId);

            if (!blog?.content?.primaryImageFileId) {
              return undefined;
            }

            const imageFileHeader = await getFileHeader(
              dotYouClient,
              targetDrive,
              blog.content.primaryImageFileId
            );
            const uniqueId = imageFileHeader.fileMetadata.appData.uniqueId;

            const params: FileQueryParams = {
              targetDrive: targetDrive,
              fileType: [0],
            };

            if (uniqueId) {
              params.clientUniqueIdAtLeastOne = [uniqueId];
            }

            return {
              name: blog.content.primaryImageFileId,
              queryParams: params,
              resultOptions: BASE_RESULT_OPTIONS,
            };
          } catch (ex) {
            return undefined;
          }
        })
    )
  )
    .filter((sectionItem) => sectionItem && sectionItem.name?.length !== 0)
    .filter(Boolean) as QueryParamsSection[];

  if (!sections.length) {
    return;
  }
  return await publishFile(dotYouClient, 'blogs.json', [...sections, ...imageSections]);
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
    ?.map((attr) => attr?.data?.['profileImageId'] as string)
    .filter((fileId) => fileId !== undefined);

  if (profilePhotoFileIds?.length) {
    const imageData = await getDecryptedImageData(
      dotYouClient,
      GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId),
      profilePhotoFileIds[0],
      { pixelWidth: 300, pixelHeight: 300, contentType: 'image/webp' }
    );
    if (imageData) {
      console.log('publishing profile image');
      await publishProfileImageFile(
        dotYouClient,
        new Uint8Array(imageData.content),
        imageData.contentType
      );
    }
  }
};
