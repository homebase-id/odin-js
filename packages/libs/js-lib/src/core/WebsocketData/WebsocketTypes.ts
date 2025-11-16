import { HomebaseFile } from '../DriveData/File/DriveFileTypes';
import { GroupEmojiReaction } from '../ReactionData/GroupReactionService';
import { TargetDrive, PushNotification } from '../core';

export interface EstablishConnectionRequest {
  drives: TargetDrive[];
  waitTimeMs: number;
  batchSize: number;
}

export type NotificationType =
  | 'deviceHandshakeSuccess'
  | 'deviceConnected'
  | 'deviceDisconnected'
  | 'pong'
  | 'fileAdded'
  | 'fileDeleted'
  | 'fileModified'
  | 'connectionRequestReceived'
  | 'connectionRequestAccepted'
  | 'connectionFinalized'
  | 'inboxItemReceived'
  | 'appNotificationAdded'
  | 'statisticsChanged'
  | 'reactionContentAdded'
  | 'reactionContentDeleted'
  | 'error'
  | 'unknown'
  | 'authenticationError';

export interface ClientNotification {
  notificationType: NotificationType;
  data: Record<string, unknown>;
}

export interface ClientFileNotification extends ClientNotification {
  notificationType: 'fileAdded' | 'fileDeleted' | 'fileModified' | 'statisticsChanged';
  targetDrive?: TargetDrive;
  header: HomebaseFile;
}

export interface ClientTransitNotification extends ClientNotification {
  notificationType: 'inboxItemReceived';
  targetDrive: TargetDrive;
}

export interface ClientDeviceNotification extends ClientNotification {
  notificationType: 'deviceHandshakeSuccess' | 'deviceConnected' | 'deviceDisconnected';
}

export interface AppNotification extends ClientNotification, PushNotification {
  notificationType: 'appNotificationAdded';
}

export interface ReactionNotification extends ClientNotification, GroupEmojiReaction {
  notificationType: 'reactionContentAdded' | 'reactionContentDeleted';
}

export interface ClientConnectionNotification extends ClientNotification {
  notificationType: 'connectionRequestReceived' | 'connectionRequestAccepted';
  sender: string;
  recipient: string;
}

export interface ClientConnectionFinalizedNotification extends ClientNotification {
  notificationType: 'connectionFinalized';
  identity: string;
}

export interface ClientUnknownNotification extends ClientNotification {
  notificationType: 'unknown';
}

export type TypedConnectionNotification =
  | ClientTransitNotification
  | ClientFileNotification
  | ClientDeviceNotification
  | ClientConnectionNotification
  | ClientConnectionFinalizedNotification
  | ClientUnknownNotification
  | AppNotification
  | ReactionNotification;

export interface WebsocketCommand {
  command: WebSocketCommands;
  data: string;
}

type WebSocketCommands =
  | 'establishConnectionRequest'
  | 'processTransitInstructions'
  | 'processInbox'
  | 'ping'
  | 'whoIsOnline';
