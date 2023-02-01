import { DataUtil } from '../DataUtil';

export class AttributeConfig {
  //Indicates that a file holds the profile definition for this drive
  static readonly AttributeFileType: number = 77;
}

export function sortByPriority(a: { priority: number }, b: { priority: number }) {
  return a.priority - b.priority;
}

export class BuiltInAttributes {
  static readonly Name = DataUtil.toGuidId('name');
  static readonly Nickname = DataUtil.toGuidId('nickname');
  static readonly Photo = DataUtil.toGuidId('photo');
  static readonly Address = DataUtil.toGuidId('location');
  static readonly Birthday = DataUtil.toGuidId('birthday');
  static readonly PhoneNumber = DataUtil.toGuidId('phonenumber');
  static readonly Email = DataUtil.toGuidId('email');
  static readonly FacebookUsername = DataUtil.toGuidId('facebook_username');
  static readonly DotYouIdentity = DataUtil.toGuidId('dot_you_identity');
  static readonly InstagramUsername = DataUtil.toGuidId('instagram_username');
  static readonly LinkedinUsername = DataUtil.toGuidId('linkedin_username');
  static readonly TiktokUsername = DataUtil.toGuidId('tiktok_username');
  static readonly TwitterUsername = DataUtil.toGuidId('twitter_username');
  static readonly CreditCard = DataUtil.toGuidId('creditcard');
  static readonly FullBio = DataUtil.toGuidId('full_bio');
  static readonly ShortBio = DataUtil.toGuidId('short_bio');
  static readonly Link = DataUtil.toGuidId('link');
}
