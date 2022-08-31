import { Guid } from 'guid-typescript';
import { DataUtil } from '../core/DataUtil';

export class ProfileConfig {
  static readonly ProfileDriveType: string = DataUtil.toByteArrayId('profile_drive_type');
  static readonly ProfileDefinitionFileType: number = 88;
}

export class BuiltInProfiles {
  static readonly StandardProfileId: string = DataUtil.toByteArrayId('StandardProfile');
  static readonly FinancialProfileId: string = DataUtil.toByteArrayId('FinancialProfile');

  static readonly PersonalInfoSectionId: Guid = Guid.parse('99999789-4444-4444-4444-111111111111');
  static readonly SocialIdentitySectionId: Guid = Guid.parse(
    '99999789-4444-4444-4444-222222222222'
  );
  static readonly CreditCardsSectionId: Guid = Guid.parse('88888789-5555-4444-5555-222222222222');
}

export class MinimalProfileFields {
  static readonly ProfileImageUrlId: string = 'profileImageId';
  static readonly FullBioId: string = 'full_bio';
  static readonly ShortBioId: string = 'short_bio';
  static readonly GiveNameId: string = 'givenName';
  static readonly SurnameId: string = 'surname';
}

export class SocialProfileFields {
  static readonly Twitter: string = 'twitter';
  static readonly Facebook: string = 'facebook';
  static readonly LinkedIn: string = 'linkedin';
  static readonly Tiktok: string = 'tiktok';
  static readonly Instagram: string = 'instagram';
}
