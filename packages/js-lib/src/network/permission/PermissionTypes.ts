export enum CirclePermissionType {
  None = 0,
  ReadConnections = 10,
}

export enum AppCirclePermissionType {
  None = 0,
  ReadConnections = 10,
  ReadCircleMembers = 50,
  ReadWhoIFollow = 80,
  ReadMyFollowers = 130,
}

export enum AppPermissionType {
  None = 0,
  ReadConnections = 10,
  ManageConnectionRequests = 30,
  ReadCircleMembers = 50,
  ReadWhoIFollow = 80,
  ReadMyFollowers = 130,
  ManageFeed = 150,
  SendDataToOtherIdentitiesOnMyBehalf = 210,
  ReceiveDataFromOtherIdentitiesOnMyBehalf = 305,
  SendPushNotifications = 405,
  PublishStaticContent = 505,
}
