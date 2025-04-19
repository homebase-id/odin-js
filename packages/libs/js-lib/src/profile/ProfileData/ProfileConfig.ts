import { toGuidId } from '../../helpers/DataUtil';

export class ProfileConfig {
  static readonly ProfileDriveType: string = '597241530e3ef24b28b9a75ec3a5c45c'; //toGuidId('profile_drive_type');
  static readonly ProfileDefinitionFileType: number = 88;
  static readonly ProfileSectionFileType: number = 99;
}

export class BuiltInProfiles {
  static readonly StandardProfileId: string = '8f12d8c4933813d378488d91ed23b64c'; //toGuidId('StandardProfile');
  static readonly WalletId: string = 'a6f991e214b11c8c9796f664e1ec0cac'; //toGuidId('FinancialProfile');

  static readonly PersonalInfoSectionId: string = toGuidId('PersonalInfoSection');
  static readonly ExternalLinksSectionId: string = toGuidId('ExternalLinksSection');
  static readonly AboutSectionId: string = toGuidId('AboutSection');
  static readonly CreditCardsSectionId: string = toGuidId('CreditCardsSection');
}

export class MinimalProfileFields {
  static readonly ProfileImageKey: string = 'profileImageKey';
  static readonly BioId: string = 'short_bio';
  static readonly ExperienceTitleId: string = 'short_bio';
  static readonly ExperienceDecriptionId: string = 'full_bio';
  static readonly ExperienceLinkId: string = 'experience_link';
  static readonly ExperienceImageFileKey: string = 'experience_image';

  static readonly GivenNameId: string = 'givenName';
  static readonly AdditionalName: string = 'additionalName';
  static readonly SurnameId: string = 'surname';
  static readonly DisplayName: string = 'displayName';
  static readonly ExplicitDisplayName: string = 'explicitDisplayName';

  static readonly Status: string = 'status';
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
  static readonly Homebase: string = 'dotyouid';
  static readonly Twitter: string = 'twitter';
  static readonly Facebook: string = 'facebook';
  static readonly LinkedIn: string = 'linkedin';
  static readonly Snapchat: string = 'snapchat';
  static readonly Tiktok: string = 'tiktok';
  static readonly Instagram: string = 'instagram';
}

export const UNLINKABLE_SOCIALS = [
  'minecraft',
  'steam',
  'discord',
  'riot games',
  'epic games',
  'stackoverflow',
];

export const getSocialLink = (type: string, username: string): string | undefined => {
  if (UNLINKABLE_SOCIALS.includes(type)) return undefined;

  return type !== 'dotyouid'
    ? `https://${type}.com/${type === SocialFields.LinkedIn ? 'in/' : type === SocialFields.Snapchat ? 'add/' : ''
    }${username}`
    : `https://${username}`;
};
