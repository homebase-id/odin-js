export enum DrivePermissionType {
  None = 0,
  Reader = 1,
  Writer = 2,
  Editor = 3,
  React = 4,
  Comment = 8,
  WriteReactionsAndComments = 12,
  ReadAndWriteReactions = 5,
  ReadAndWriteReactionsAndComments = 13,
  Full = 17,
}

export enum CirclePermissionType {
  None = 0,
  ReadConnections = 10,
  ReadCircleMembers = 50,
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
  SendDataToOtherIdentitiesOnMyBehalf = 210,
  ReceiveDataFromOtherIdentitiesOnMyBehalf = 305,
}
