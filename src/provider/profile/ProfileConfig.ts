import { DataUtil } from '../core/DataUtil';

export class ProfileConfig {
  static readonly ProfileDriveType: string = '597241530e3ef24b28b9a75ec3a5c45c'; //DataUtil.toGuidId('profile_drive_type');
  static readonly ProfileDefinitionFileType: number = 88;
  static readonly ProfileSectionFileType: number = 99;
}

export class BuiltInProfiles {
  static readonly StandardProfileId: string = '8f12d8c4933813d378488d91ed23b64c'; //DataUtil.toGuidId('StandardProfile');
  static readonly WalletId: string = 'a6f991e214b11c8c9796f664e1ec0cac'; //DataUtil.toGuidId('FinancialProfile');

  static readonly PersonalInfoSectionId: string = DataUtil.toGuidId('PersonalInfoSection');
  static readonly ExternalLinksSectionId: string = DataUtil.toGuidId('ExternalLinksSection');
  static readonly CreditCardsSectionId: string = DataUtil.toGuidId('CreditCardsSection');
}

export class MinimalProfileFields {
  static readonly ProfileImageId: string = 'profileImageId';
  static readonly FullBioId: string = 'full_bio';
  static readonly ShortBioId: string = 'short_bio';

  static readonly GivenNameId: string = 'givenName';
  static readonly AdditionalName: string = 'additionalName';
  static readonly SurnameId: string = 'surname';
  static readonly DisplayName: string = 'displayName';
}

export class LinkFields {
  static readonly LinkText: string = 'link_text';
  static readonly LinkTarget: string = 'link_target';
}

export class LocationFields {
  static readonly Label: string = 'label';
  static readonly AddressLine1: string = 'address1';
  static readonly AddressLine2: string = 'address2';
  static readonly Postcode: string = 'postcode';
  static readonly City: string = 'city';
  static readonly Country: string = 'country';
  static readonly Coordinates: string = 'coordinates';
  static readonly DisplayLocation: string = 'display';
}

export class NicknameFields {
  static readonly NickName: string = 'nickName';
}
export class BirthdayFields {
  static readonly Date: string = 'birtday_date';
}
export class PhoneFields {
  static readonly Label: string = 'label';
  static readonly PhoneNumber: string = 'phone_number';
}

export class EmailFields {
  static readonly Label: string = 'label';
  static readonly Email: string = 'email';
}

export class CredictCardFields {
  static readonly Alias: string = 'cc_alias';
  static readonly Name: string = 'cc_name';
  static readonly Number: string = 'cc_number';
  static readonly Expiration: string = 'cc_expiration';
  static readonly Cvc: string = 'cc_cvc';
}

export class SocialFields {
  static readonly Twitter: string = 'twitter';
  static readonly Facebook: string = 'facebook';
  static readonly LinkedIn: string = 'linkedin';
  static readonly Tiktok: string = 'tiktok';
  static readonly Instagram: string = 'instagram';
}
