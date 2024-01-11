import { DriveSearchResult } from '../DriveData/File/DriveFileTypes';
import { TargetDrive, ExternalFileIdentifier } from '../core';

export interface EstablishConnectionRequest {
  drives: TargetDrive[];
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
  | 'transitFileReceived'
  | 'unknown';

export interface ClientNotification {
  notificationType: NotificationType;
  data: Record<string, unknown>;
}

export interface ClientFileNotification extends ClientNotification {
  notificationType: 'fileAdded' | 'fileDeleted' | 'fileModified';
  targetDrive?: TargetDrive;
  header: DriveSearchResult;
}

export interface ClientTransitNotification extends ClientNotification {
  notificationType: 'transitFileReceived';
  externalFileIdentifier: ExternalFileIdentifier;
}

export interface ClientDeviceNotification extends ClientNotification {
  notificationType: 'deviceHandshakeSuccess' | 'deviceConnected' | 'deviceDisconnected';
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
  | ClientUnknownNotification;

export interface WebsocketCommand {
  command: string;
  data?: string;
}
