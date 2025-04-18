import { toGuidId } from '../../helpers/helpers';

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

  static readonly HomebaseIdentity = toGuidId('dot_you_identity');
  static readonly FacebookUsername = toGuidId('facebook_username');
  static readonly InstagramUsername = toGuidId('instagram_username');
  static readonly LinkedinUsername = toGuidId('linkedin_username');
  static readonly TiktokUsername = toGuidId('tiktok_username');
  static readonly TwitterUsername = toGuidId('twitter_username');
  static readonly YoutubeUsername = toGuidId('youtube_username');
  static readonly DiscordUsername = toGuidId('discord_username');
  static readonly SnapchatUsername = toGuidId('snapchat_username');
  static readonly EpicUsername = toGuidId('epic_username');
  static readonly RiotUsername = toGuidId('riot_username');
  static readonly SteamUsername = toGuidId('steam_username');
  static readonly MinecraftUsername = toGuidId('minecraft_username');
  static readonly GithubUsername = toGuidId('github_username');
  static readonly StackoverflowUsername = toGuidId('stackoverflow_username');
  static readonly Link = toGuidId('link');

  static readonly CreditCard = toGuidId('creditcard');
  static readonly Experience = toGuidId('full_bio');
  static readonly Bio = toGuidId('short_bio');
  static readonly Status = toGuidId('status');

  static readonly AllPersonal = [
    BuiltInAttributes.Name,
    BuiltInAttributes.Nickname,
    BuiltInAttributes.Photo,
    BuiltInAttributes.Address,
    BuiltInAttributes.Birthday,
    BuiltInAttributes.PhoneNumber,
    BuiltInAttributes.Email,
  ];

  static readonly AllSocial = [
    BuiltInAttributes.HomebaseIdentity,
    BuiltInAttributes.TwitterUsername,
    BuiltInAttributes.FacebookUsername,
    BuiltInAttributes.InstagramUsername,
    BuiltInAttributes.TiktokUsername,
    BuiltInAttributes.LinkedinUsername,
    BuiltInAttributes.YoutubeUsername,
    BuiltInAttributes.DiscordUsername,
    BuiltInAttributes.SnapchatUsername,
    BuiltInAttributes.GithubUsername,
    BuiltInAttributes.StackoverflowUsername,
  ];

  static readonly AllGames = [
    BuiltInAttributes.EpicUsername,
    BuiltInAttributes.RiotUsername,
    BuiltInAttributes.SteamUsername,
    BuiltInAttributes.MinecraftUsername,
  ];
}
