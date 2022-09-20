import { DataUtil } from '../core/DataUtil';

export class ProfileConfig {
  static readonly ProfileDriveType: string = DataUtil.toByteArrayId('profile_drive_type');
  static readonly ProfileDefinitionFileType: number = 88;
  static readonly ProfileSectionFileType: number = 99;
}

export class BuiltInProfiles {
  static readonly StandardProfileId: string = DataUtil.toByteArrayId('StandardProfile');
  static readonly FinancialProfileId: string = DataUtil.toByteArrayId('FinancialProfile');

  static readonly PersonalInfoSectionId: string = DataUtil.toByteArrayId('PersonalInfoSection');
  static readonly ExternalLinksSectionId: string = DataUtil.toByteArrayId('ExternalLinksSection');
  static readonly CreditCardsSectionId: string = DataUtil.toByteArrayId('CreditCardsSection');
}

export class MinimalProfileFields {
  static readonly ProfileImageUrlId: string = 'profileImageId';
  static readonly FullBioId: string = 'full_bio';
  static readonly ShortBioId: string = 'short_bio';
  static readonly GivenNameId: string = 'givenName';
  static readonly SurnameId: string = 'surname';
}

export class LinkProfileFields {
  static readonly LinkText: string = 'link_text';
  static readonly LinkTarget: string = 'link_target';
}

export class SocialProfileFields {
  static readonly Twitter: string = 'twitter';
  static readonly Facebook: string = 'facebook';
  static readonly LinkedIn: string = 'linkedin';
  static readonly Tiktok: string = 'tiktok';
  static readonly Instagram: string = 'instagram';
}
