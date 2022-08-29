import { Guid } from 'guid-typescript';
import { DataUtil } from '../core/DataUtil';

export class ProfileConfig {
  //The drive that stores configuration for profile data
  // static readonly ConfigDriveAlias: Guid = Guid.parse("99999789-5555-5555-4444-000000005555");
  // static readonly ProfileDriveType: Guid = Guid.parse('11112222-0000-0000-0000-000000001111');

  static readonly ProfileDriveType: string = DataUtil.toByteArrayId('profile_drive_type');

  //Indicates that a file holds the profile definition for this drive
  static readonly ProfileDefinitionFileType: number = 88;
}

export class BuiltInProfiles {
  // static readonly StandardProfileId: Guid = Guid.parse('99999789-4444-4444-4444-000000006666');
  // static readonly FinancialProfileId: Guid = Guid.parse('99999789-4444-4444-4444-000000007777');

  static readonly StandardProfileId: string = DataUtil.toByteArrayId('StandardProfile');
  static readonly FinancialProfileId: string = DataUtil.toByteArrayId('FinancialProfile');

  static readonly PersonalInfoSectionId: Guid = Guid.parse('99999789-4444-4444-4444-111111111111');
  static readonly SocialIdentitySectionId: Guid = Guid.parse(
    '99999789-4444-4444-4444-222222222222'
  );
  static readonly CreditCardsSectionId: Guid = Guid.parse('88888789-5555-4444-5555-222222222222');
}

export class BuiltInProfileAttributes {
  static readonly PersonalInfo: Guid = Guid.parse('33334444-4444-4444-4444-000000004440');
  static ProfilePhotos: Guid = Guid.parse('66664444-4444-4444-4444-000000004440');
  static Bio: Guid = Guid.parse('77774444-4444-4444-4444-000000004440');
  static CreditCards: Guid = Guid.parse('88884444-4444-4444-4444-000000004440');
  static Twitter: Guid = Guid.parse('99994444-4444-4444-4444-000000004440');
  static Facebook: Guid = Guid.parse('99994444-4444-4444-4444-000000003330');
  static Instagram: Guid = Guid.parse('99994444-4444-4444-4444-000000005440');
  static Tiktok: Guid = Guid.parse('99994444-4444-4444-4444-000000007740');
  static LinkedIn: Guid = Guid.parse('99994444-4444-4444-4444-000000009990');
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
