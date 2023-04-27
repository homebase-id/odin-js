import { toGuidId } from '@youfoundation/js-lib';

export interface AttributeDefinition {
  type: string;
  name: string;
  description: string;
}

export const AttributeDefinitions = {
  Name: {
    type: toGuidId('name'),
    name: 'Name',
    description: 'First name, last name, etc.',
  },

  Nickname: {
    type: toGuidId('nickname'),
    name: 'Nickname',
    description: 'Friendly name',
  },

  Photo: {
    type: toGuidId('photo'),
    name: 'Profile photo',
    description: 'A photo or image of various formats',
  },

  Address: {
    type: toGuidId('location'),
    name: 'Address',
    description: 'An address',
  },

  Birthday: {
    type: toGuidId('birthday'),
    name: 'Birthday',
    description: 'Your birthday',
  },

  PhoneNumber: {
    type: toGuidId('phonenumber'),
    name: 'Phone number',
    description: 'Your phone number',
  },

  Email: {
    type: toGuidId('email'),
    name: 'Email',
    description: 'Your email',
  },

  FacebookUsername: {
    type: toGuidId('facebook_username'),
    name: 'Facebook',
    description: 'A facebook username',
  },

  OdinIdentity: {
    type: toGuidId('dot_you_identity'),
    name: 'Dot You Id',
    description: 'A dot you id',
  },

  InstagramUsername: {
    type: toGuidId('instagram_username'),
    name: 'Instagram',
    description: 'An Instagram Username',
  },

  LinkedinUsername: {
    type: toGuidId('linkedin_username'),
    name: 'LinkedIn',
    description: 'A LinkedIn username',
  },

  TiktokUsername: {
    type: toGuidId('tiktok_username'),
    name: 'Tiktok',
    description: 'A TikTok username',
  },

  TwitterUsername: {
    type: toGuidId('twitter_username'),
    name: 'Twitter',
    description: 'A Twitter username',
  },

  YoutubeUsername: {
    type: toGuidId('youtube_username'),
    name: 'Youtube',
    description: 'A Youtube username',
  },

  DiscordUsername: {
    type: toGuidId('discord_username'),
    name: 'Discord',
    description: 'A Discord username',
  },

  EpicUsername: {
    type: toGuidId('epic_username'),
    name: 'Epic games',
    description: 'Epic username',
  },

  RiotUsername: {
    type: toGuidId('riot_username'),
    name: 'Riot games',
    description: 'Riot username',
  },

  SteamUsername: {
    type: toGuidId('steam_username'),
    name: 'Steam',
    description: 'Steam username',
  },

  MinecraftUsername: {
    type: toGuidId('minecraft_username'),
    name: 'Minecraft',
    description: 'Minecraft username',
  },

  GithubUsername: {
    type: toGuidId('github_username'),
    name: 'Github',
    description: 'Github username',
  },

  StackoverflowUsername: {
    type: toGuidId('stackoverflow_username'),
    name: 'Stackoverflow',
    description: 'Stackoverflow username',
  },

  CreditCard: {
    type: toGuidId('creditcard'),
    name: 'Credit Card info',
    description: 'Credit card info',
  },

  FullBio: {
    type: toGuidId('full_bio'),
    name: 'Full Bio',
    description: 'A long-form bio information about yourself',
  },

  ShortBio: {
    type: toGuidId('short_bio'),
    name: 'Short Bio',
    description: 'A few lines describing yourself, your mission, your passions, etc.',
  },

  Link: {
    type: toGuidId('link'),
    name: 'Link',
    description: 'Link entry, make your online world accessible',
  },

  Theme: {
    type: toGuidId('theme_attribute'),
    name: 'Theme',
    description: 'Theme configuration',
  },

  Homepage: {
    type: toGuidId('homepage_attribute'),
    name: 'Homepage',
    description: 'Homepage configuration',
  },
};
