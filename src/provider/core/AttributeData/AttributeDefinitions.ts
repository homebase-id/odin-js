import { DataUtil } from '../DataUtil';
import { Guid } from 'guid-typescript';

export interface AttributeDefinition {
  type: Guid;
  name: string;
  description: string;
}

export const AttributeDefinitions = {
  Name: {
    type: DataUtil.stringToMD5basedGuid('name'),
    name: 'Name Information',
    description: 'First name, last name, etc.',
  },

  Photo: {
    type: DataUtil.stringToMD5basedGuid('photo'),
    name: 'Photo/Image',
    description: 'A photo or image of various formats',
  },

  FacebookUsername: {
    type: DataUtil.stringToMD5basedGuid('facebook_username'),
    name: 'Facebook',
    description: 'A facebook username',
  },

  InstagramUsername: {
    type: DataUtil.stringToMD5basedGuid('instagram_username'),
    name: 'Instagram',
    description: 'An Instagram Username',
  },

  LinkedInUsername: {
    type: DataUtil.stringToMD5basedGuid('linkedin_username'),
    name: 'LinkedIn',
    description: 'A LinkedIn username',
  },

  TiktokUsername: {
    type: DataUtil.stringToMD5basedGuid('tiktok_username'),
    name: 'Tiktok',
    description: 'A TikTok username',
  },

  TwitterUsername: {
    type: DataUtil.stringToMD5basedGuid('twitter_username'),
    name: 'Twitter',
    description: 'A twitter username',
  },

  CreditCard: {
    type: DataUtil.stringToMD5basedGuid('creditcard'),
    name: 'Credit Card info',
    description: 'Credit card info',
  },

  FullBio: {
    type: DataUtil.stringToMD5basedGuid('full_bio'),
    name: 'Full Bio',
    description: 'A long-form bio information about yourself',
  },

  ShortBio: {
    type: DataUtil.stringToMD5basedGuid('short_bio'),
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
  AttributeDefinitions.LinkedInUsername,
  AttributeDefinitions.CreditCard,
  AttributeDefinitions.FullBio,
  AttributeDefinitions.ShortBio,
];
