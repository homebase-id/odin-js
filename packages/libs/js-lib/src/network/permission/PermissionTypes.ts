export enum CirclePermissionType {
  None = 0,
  ReadConnections = 10,
  IntroduceMe = 808,
}

export enum AppCirclePermissionType {
  None = 0,
  ReadConnections = 10,
  ReadCircleMembers = 50,
  ReadWhoIFollow = 80,
  ReadMyFollowers = 130,
  ManageContacts = 160
}

export enum AppPermissionType {
  None = 0,
  ReadConnections = 10,
  ReadConnectionRequests = 30,
  ReadCircleMembers = 50,
  ReadWhoIFollow = 80,
  ReadMyFollowers = 130,
  ManageFeed = 150,
  ManageContacts = 160,
  SendDataToOtherIdentitiesOnMyBehalf = 210,
  ReceiveDataFromOtherIdentitiesOnMyBehalf = 305,
  SendPushNotifications = 405,
  PublishStaticContent = 505,
  SendIntroductions = 909,
}

/**
 * Every permission key the identity host knows about. Mirrors PermissionKeys in odin-core
 * (services/Odin.Services/Authorization/Permissions/CirclePermissionFlags.cs).
 *
 * AppPermissionType covers only the subset an app may request, so it cannot be used to label a
 * circle's keys: a circle can hold ManageCircleMembership, ManageProfile, SendOnBehalfOfOwner or
 * AllowIntroductions, and the built-in "Confirmed Connections" circle holds exactly the last of
 * those. Names here match the server's constants rather than AppPermissionType's aliases.
 */
export enum PermissionKeyType {
  None = 0,
  ReadConnections = 10,
  ReadConnectionRequests = 30,
  ReadCircleMembership = 50,
  ManageCircleMembership = 51,
  ReadWhoIFollow = 80,
  ReadMyFollowers = 130,
  ManageFeed = 150,
  ManageContacts = 160,
  ManageProfile = 170,
  UseTransitWrite = 210,
  UseTransitRead = 305,
  SendPushNotifications = 405,
  PublishStaticContent = 505,
  SendOnBehalfOfOwner = 707,
  AllowIntroductions = 808,
  SendIntroductions = 909,
}
