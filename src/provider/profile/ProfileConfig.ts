import { DataUtil } from '../core/DataUtil';

export class ProfileConfig {
  static readonly ProfileDriveType: string = '597241530e3ef24b28b9a75ec3a5c45c'; //DataUtil.toGuidId('profile_drive_type');
  static readonly ProfileDefinitionFileType: number = 88;
  static readonly ProfileSectionFileType: number = 99;
}

export class BuiltInProfiles {
  static readonly StandardProfileId: string = '8f12d8c4933813d378488d91ed23b64c'; //DataUtil.toGuidId('StandardProfile');
  static readonly FinancialProfileId: string = DataUtil.toGuidId('FinancialProfile');

  static readonly PersonalInfoSectionId: string = DataUtil.toGuidId('PersonalInfoSection');
  static readonly ExternalLinksSectionId: string = DataUtil.toGuidId('ExternalLinksSection');
  static readonly CreditCardsSectionId: string = DataUtil.toGuidId('CreditCardsSection');
}

export class MinimalProfileFields {
  static readonly ProfileImageId: string = 'profileImageId';
  static readonly FullBioId: string = 'full_bio';
  static readonly ShortBioId: string = 'short_bio';
  static readonly GivenNameId: string = 'givenName';
  static readonly SurnameId: string = 'surname';
}

export class LinkProfileFields {
  static readonly LinkText: string = 'link_text';
  static readonly LinkTarget: string = 'link_target';
}

export class LocationProfileFields {
  static readonly City: string = 'location_city';
  static readonly Country: string = 'location_country';
}

export class SocialProfileFields {
  static readonly Twitter: string = 'twitter';
  static readonly Facebook: string = 'facebook';
  static readonly LinkedIn: string = 'linkedin';
  static readonly Tiktok: string = 'tiktok';
  static readonly Instagram: string = 'instagram';
}
