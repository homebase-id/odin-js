import { FileQueryParams } from '../../core/DriveData/Drive/DriveTypes';
import { DEFAULT_PAYLOAD_KEY, TargetDrive } from '../../core/core';
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
  tagsMatchAtLeastOne: [BuiltInAttributes.Name.toString()],
};

const personalInfoPhotoQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  groupId: [BuiltInProfiles.PersonalInfoSectionId.toString()],
  tagsMatchAtLeastOne: [BuiltInAttributes.Photo.toString()],
};

const personalInfoStatusQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  groupId: [BuiltInProfiles.PersonalInfoSectionId.toString()],
  tagsMatchAtLeastOne: [BuiltInAttributes.Status.toString()],
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

const experienceFileQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  tagsMatchAtLeastOne: [BuiltInAttributes.Experience.toString()],
};

const shortBioFileQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  tagsMatchAtLeastOne: [BuiltInAttributes.FullBio.toString()],
};

const shortBioSummaryFileQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  tagsMatchAtLeastOne: [BuiltInAttributes.BioSummary.toString()],
};

const linkFileQueryParam: FileQueryParams = {
  targetDrive: profileDrive,
  fileType: [AttributeConfig.AttributeFileType],
  tagsMatchAtLeastOne: [BuiltInAttributes.Link.toString()],
};

export const BASE_RESULT_OPTIONS = {
  includeHeaderContent: true,
  payloadKeys: [DEFAULT_PAYLOAD_KEY],
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
    name: 'long-bio',
    queryParams: experienceFileQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
  {
    name: 'short-bio',
    queryParams: shortBioFileQueryParam,
    resultOptions: BASE_RESULT_OPTIONS,
  },
  {
    name: 'short-bio-summary',
    queryParams: shortBioSummaryFileQueryParam,
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
];
