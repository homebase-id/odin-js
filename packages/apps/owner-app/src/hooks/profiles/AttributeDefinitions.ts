import { BuiltInAttributes } from '@homebase-id/js-lib/profile';
import { HomePageAttributes } from '@homebase-id/js-lib/public';

export interface AttributeDefinition {
  type: string;
  name: string;
  description: string;
}

export const AttributeDefinitions = {
  Name: {
    type: BuiltInAttributes.Name,
    name: 'Name',
    description: 'First name, last name, etc.',
  },

  Nickname: {
    type: BuiltInAttributes.Nickname,
    name: 'Nickname',
    description: 'Friendly name',
  },

  Photo: {
    type: BuiltInAttributes.Photo,
    name: 'Profile photo',
    description: 'A photo or image of various formats',
  },

  Address: {
    type: BuiltInAttributes.Address,
    name: 'Address',
    description: 'An address',
  },

  Birthday: {
    type: BuiltInAttributes.Birthday,
    name: 'Birthday',
    description: 'Your birthday',
  },

  PhoneNumber: {
    type: BuiltInAttributes.PhoneNumber,
    name: 'Phone number',
    description: 'Your phone number',
  },

  Email: {
    type: BuiltInAttributes.Email,
    name: 'Email',
    description: 'Your email',
  },

  OdinIdentity: {
    type: BuiltInAttributes.HomebaseIdentity,
    name: 'Homebase id',
    description: 'A homebase id',
  },

  FacebookUsername: {
    type: BuiltInAttributes.FacebookUsername,
    name: 'Facebook',
    description: 'A facebook username',
  },

  InstagramUsername: {
    type: BuiltInAttributes.InstagramUsername,
    name: 'Instagram',
    description: 'An Instagram Username',
  },

  LinkedinUsername: {
    type: BuiltInAttributes.LinkedinUsername,
    name: 'LinkedIn',
    description: 'A LinkedIn username',
  },

  TiktokUsername: {
    type: BuiltInAttributes.TiktokUsername,
    name: 'Tiktok',
    description: 'A TikTok username',
  },

  TwitterUsername: {
    type: BuiltInAttributes.TwitterUsername,
    name: 'Twitter',
    description: 'A Twitter username',
  },

  YoutubeUsername: {
    type: BuiltInAttributes.YoutubeUsername,
    name: 'Youtube',
    description: 'A Youtube username',
  },

  DiscordUsername: {
    type: BuiltInAttributes.DiscordUsername,
    name: 'Discord',
    description: 'A Discord username',
  },

  SnapchatUsername: {
    type: BuiltInAttributes.SnapchatUsername,
    name: 'Snapchat',
    description: 'A Snapchat username',
  },

  EpicUsername: {
    type: BuiltInAttributes.EpicUsername,
    name: 'Epic games',
    description: 'Epic username',
  },

  RiotUsername: {
    type: BuiltInAttributes.RiotUsername,
    name: 'Riot games',
    description: 'Riot username',
  },

  SteamUsername: {
    type: BuiltInAttributes.SteamUsername,
    name: 'Steam',
    description: 'Steam username',
  },

  MinecraftUsername: {
    type: BuiltInAttributes.MinecraftUsername,
    name: 'Minecraft',
    description: 'Minecraft username',
  },

  GithubUsername: {
    type: BuiltInAttributes.GithubUsername,
    name: 'Github',
    description: 'Github username',
  },

  StackoverflowUsername: {
    type: BuiltInAttributes.StackoverflowUsername,
    name: 'Stackoverflow',
    description: 'Stackoverflow username',
  },

  CreditCard: {
    type: BuiltInAttributes.CreditCard,
    name: 'Credit Card info',
    description: 'Credit card info',
  },

  Experience: {
    type: BuiltInAttributes.Experience,
    name: 'Experience',
    description: 'A description of your experience, education, etc',
  },

  Bio: {
    type: BuiltInAttributes.FullBio,
    name: 'Bio',
    description: 'Your detailed biography, your story, etc.',
  },

  BioSummary: {
    type: BuiltInAttributes.BioSummary,
    name: 'Short bio',
    description: 'A few lines describing yourself, your mission, your passions, etc.',
  },

  Status: {
    type: BuiltInAttributes.Status,
    name: 'Status',
    description: 'your current status',
  },

  Link: {
    type: BuiltInAttributes.Link,
    name: 'Website link',
    description: 'Link entry, make your online world accessible',
  },

  Theme: {
    type: HomePageAttributes.Theme,
    name: 'Theme',
    description: 'Theme configuration',
  },
};

export class AttributeGroups {
  static readonly PersonalInfoSectionAttributes = BuiltInAttributes.AllPersonal;
  static readonly ExternalLinksSectionAttributes = [
    ...BuiltInAttributes.AllSocial,
    ...BuiltInAttributes.AllGames,
    BuiltInAttributes.Link,
  ];
  static readonly AboutSectionAttributes = [
    BuiltInAttributes.Experience,
    BuiltInAttributes.FullBio,
    BuiltInAttributes.BioSummary,
    BuiltInAttributes.Status,
  ];
  static readonly CreditCardSectionAttributes = [BuiltInAttributes.CreditCard];
}
