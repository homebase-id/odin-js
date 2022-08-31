import { DataUtil } from '../DataUtil';

export interface AttributeDefinition {
  type: string;
  name: string;
  description: string;
}

export const AttributeDefinitions = {
  Name: {
    type: DataUtil.stringToMD5basedGuid('name').toString(),
    name: 'Name Information',
    description: 'First name, last name, etc.',
  },

  Photo: {
    type: DataUtil.stringToMD5basedGuid('photo').toString(),
    name: 'Photo/Image',
    description: 'A photo or image of various formats',
  },

  FacebookUsername: {
    type: DataUtil.stringToMD5basedGuid('facebook_username').toString(),
    name: 'Facebook',
    description: 'A facebook username',
  },

  InstagramUsername: {
    type: DataUtil.stringToMD5basedGuid('instagram_username').toString(),
    name: 'Instagram',
    description: 'An Instagram Username',
  },

  LinkedinUsername: {
    type: DataUtil.stringToMD5basedGuid('linkedin_username').toString(),
    name: 'LinkedIn',
    description: 'A LinkedIn username',
  },

  TiktokUsername: {
    type: DataUtil.stringToMD5basedGuid('tiktok_username').toString(),
    name: 'Tiktok',
    description: 'A TikTok username',
  },

  TwitterUsername: {
    type: DataUtil.stringToMD5basedGuid('twitter_username').toString(),
    name: 'Twitter',
    description: 'A twitter username',
  },

  CreditCard: {
    type: DataUtil.stringToMD5basedGuid('creditcard').toString(),
    name: 'Credit Card info',
    description: 'Credit card info',
  },

  FullBio: {
    type: DataUtil.stringToMD5basedGuid('full_bio').toString(),
    name: 'Full Bio',
    description: 'A long-form bio information about yourself',
  },

  ShortBio: {
    type: DataUtil.stringToMD5basedGuid('short_bio').toString(),
    name: 'Short Bio',
    description: 'A few lines describing yourself, your mission, your passions, etc.',
  },
};

export const attributeViewRegistry: AttributeDefinition[] = [
  AttributeDefinitions.Name,
  AttributeDefinitions.Photo,
  AttributeDefinitions.TwitterUsername,
  AttributeDefinitions.FacebookUsername,
  AttributeDefinitions.TiktokUsername,
  AttributeDefinitions.InstagramUsername,
  AttributeDefinitions.LinkedinUsername,
  AttributeDefinitions.CreditCard,
  AttributeDefinitions.FullBio,
  AttributeDefinitions.ShortBio,
];
