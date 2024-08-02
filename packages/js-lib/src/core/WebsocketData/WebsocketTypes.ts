import { HomebaseFile } from '../DriveData/File/DriveFileTypes';
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
  | 'inboxItemReceived'
  | 'appNotificationAdded'
  | 'error'
  | 'unknown';

export interface ClientNotification {
  notificationType: NotificationType;
  data: Record<string, unknown>;
}

export interface ClientFileNotification extends ClientNotification {
  notificationType: 'fileAdded' | 'fileDeleted' | 'fileModified';
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

export interface ClientConnectionNotification extends ClientNotification {
  notificationType: 'connectionRequestReceived' | 'connectionRequestAccepted';
  sender: string;
  recipient: string;
}

export interface ClientUnknownNotification extends ClientNotification {
  notificationType: 'unknown';
}

export type TypedConnectionNotification =
  | ClientTransitNotification
  | ClientFileNotification
  | ClientDeviceNotification
  | ClientConnectionNotification
  | ClientUnknownNotification
  | AppNotification;

export interface WebsocketCommand {
  command: string;
  data: string;
}
