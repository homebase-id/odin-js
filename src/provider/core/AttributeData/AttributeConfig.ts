import { toGuidId } from '../DataUtil';

export class AttributeConfig {
  //Indicates that a file holds the profile definition for this drive
  static readonly AttributeFileType: number = 77;
}

export function sortByPriority(a: { priority: number }, b: { priority: number }) {
  return a.priority - b.priority;
}

export class BuiltInAttributes {
  static readonly Name = toGuidId('name');
  static readonly Nickname = toGuidId('nickname');
  static readonly Photo = toGuidId('photo');
  static readonly Address = toGuidId('location');
  static readonly Birthday = toGuidId('birthday');
  static readonly PhoneNumber = toGuidId('phonenumber');
  static readonly Email = toGuidId('email');
  static readonly FacebookUsername = toGuidId('facebook_username');
  static readonly OdinIdentity = toGuidId('dot_you_identity');
  static readonly InstagramUsername = toGuidId('instagram_username');
  static readonly LinkedinUsername = toGuidId('linkedin_username');
  static readonly TiktokUsername = toGuidId('tiktok_username');
  static readonly TwitterUsername = toGuidId('twitter_username');
  static readonly CreditCard = toGuidId('creditcard');
  static readonly FullBio = toGuidId('full_bio');
  static readonly ShortBio = toGuidId('short_bio');
  static readonly Link = toGuidId('link');
}
