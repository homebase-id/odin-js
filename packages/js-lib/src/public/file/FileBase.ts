import { FileQueryParams } from '../../core/DriveData/DriveTypes';
import { TargetDrive } from '../../core/core';
import { ProfileConfig, BuiltInProfiles } from '../../profile/ProfileData/ProfileConfig';
import { AttributeConfig, BuiltInAttributes } from '../../profile/profile';
import { HomePageConfig, HomePageAttributes } from '../home/HomeTypes';

const homepageDrive: TargetDrive = {
  alias: HomePageConfig.DefaultDriveId.toString(),
  type: ProfileConfig.ProfileDriveType.toString(),
};

const profileDrive: TargetDrive = {
  alias: BuiltInProfiles.StandardProfileId.toString(),
  type: ProfileConfig.ProfileDriveType.toString(),
};

const personalInfoNameQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  groupId: [BuiltInProfiles.PersonalInfoSectionId.toString()],
  tagsMatchAll: [BuiltInAttributes.Name.toString()],
};

const personalInfoPhotoQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  groupId: [BuiltInProfiles.PersonalInfoSectionId.toString()],
  tagsMatchAll: [BuiltInAttributes.Photo.toString()],
};

const personalInfoStatusQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  groupId: [BuiltInProfiles.PersonalInfoSectionId.toString()],
  tagsMatchAll: [BuiltInAttributes.Status.toString()],
};

const SocialQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  tagsMatchAtLeastOne: [...BuiltInAttributes.AllSocial, ...BuiltInAttributes.AllGames],
};

const themeFileQueryParam: FileQueryParams = {
  targetDrive: homepageDrive,
  fileType: [AttributeConfig.AttributeFileType],
  tagsMatchAtLeastOne: [HomePageAttributes.Theme.toString()],
};

const fullBioFileQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  tagsMatchAtLeastOne: [BuiltInAttributes.FullBio.toString()],
};

const shortBioFileQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  tagsMatchAtLeastOne: [BuiltInAttributes.ShortBio.toString()],
};

const linkFileQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  tagsMatchAtLeastOne: [BuiltInAttributes.Link.toString()],
};

const homeFileQueryParam: FileQueryParams = {
  targetDrive: homepageDrive,
  fileType: [AttributeConfig.AttributeFileType],
  tagsMatchAtLeastOne: [HomePageAttributes.HomePage.toString()],
};

export const BASE_RESULT_OPTIONS = {
  includeAdditionalThumbnails: false,
  includeJsonContent: true,
  includePayload: false,
  excludePreviewThumbnail: false,
};

export const DEFAULT_SECTIONS = [
  {
    name: 'socials',
    queryParams: SocialQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
  {
    name: 'name',
    queryParams: personalInfoNameQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
  {
    name: 'photo',
    queryParams: personalInfoPhotoQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
  {
    name: 'status',
    queryParams: personalInfoStatusQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
  {
    name: 'full-bio',
    queryParams: fullBioFileQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
  {
    name: 'short-bio',
    queryParams: shortBioFileQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
  {
    name: 'link',
    queryParams: linkFileQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
  {
    name: 'theme',
    queryParams: themeFileQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
  {
    name: 'home',
    queryParams: homeFileQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
];

export const DEFAULT_PUBLIC_SECTIONS = [
  {
    name: 'name',
    queryParams: personalInfoNameQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
  {
    name: 'photo',
    queryParams: personalInfoPhotoQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
];
