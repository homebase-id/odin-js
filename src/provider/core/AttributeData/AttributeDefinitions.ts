import { DataUtil } from '../DataUtil';

export interface AttributeDefinition {
  type: string;
  name: string;
  description: string;
}

export const AttributeDefinitions = {
  Name: {
    type: DataUtil.toGuidId('name'),
    name: 'Name',
    description: 'First name, last name, etc.',
  },

  Photo: {
    type: DataUtil.toGuidId('photo'),
    name: 'Profile photo',
    description: 'A photo or image of various formats',
  },

  Location: {
    type: DataUtil.toGuidId('location'),
    name: 'Location',
    description: 'A general location',
  },

  Birthday: {
    type: DataUtil.toGuidId('birthday'),
    name: 'Birthday',
    description: 'Your birthday',
  },

  PhoneNumber: {
    type: DataUtil.toGuidId('phonenumber'),
    name: 'Phone number',
    description: 'Your phone number',
  },

  FacebookUsername: {
    type: DataUtil.toGuidId('facebook_username'),
    name: 'Facebook',
    description: 'A facebook username',
  },

  InstagramUsername: {
    type: DataUtil.toGuidId('instagram_username'),
    name: 'Instagram',
    description: 'An Instagram Username',
  },

  LinkedinUsername: {
    type: DataUtil.toGuidId('linkedin_username'),
    name: 'LinkedIn',
    description: 'A LinkedIn username',
  },

  TiktokUsername: {
    type: DataUtil.toGuidId('tiktok_username'),
    name: 'Tiktok',
    description: 'A TikTok username',
  },

  TwitterUsername: {
    type: DataUtil.toGuidId('twitter_username'),
    name: 'Twitter',
    description: 'A twitter username',
  },

  CreditCard: {
    type: DataUtil.toGuidId('creditcard'),
    name: 'Credit Card info',
    description: 'Credit card info',
  },

  FullBio: {
    type: DataUtil.toGuidId('full_bio'),
    name: 'Full Bio',
    description: 'A long-form bio information about yourself',
  },

  ShortBio: {
    type: DataUtil.toGuidId('short_bio'),
    name: 'Short Bio',
    description: 'A few lines describing yourself, your mission, your passions, etc.',
  },

  Link: {
    type: DataUtil.toGuidId('link'),
    name: 'Link',
    description: 'Link entry, make your online world accessible',
  },
};

export const attributeViewRegistry: AttributeDefinition[] = [
  AttributeDefinitions.Name,
  AttributeDefinitions.Photo,
  AttributeDefinitions.Location,
  AttributeDefinitions.TwitterUsername,
  AttributeDefinitions.FacebookUsername,
  AttributeDefinitions.TiktokUsername,
  AttributeDefinitions.InstagramUsername,
  AttributeDefinitions.LinkedinUsername,
  AttributeDefinitions.CreditCard,
  AttributeDefinitions.FullBio,
  AttributeDefinitions.ShortBio,
  AttributeDefinitions.Link,
];
