import { tryJsonParse } from '../../helpers/helpers';
import { decryptData } from '../InterceptionEncryptionUtil';
import {
  ClientConnectionNotification,
  ClientDeviceNotification,
  ClientFileNotification,
  ClientTransitNotification,
  ClientUnknownNotification,
  NotificationType,
  TypedConnectionNotification,
  AppNotification,
  ReactionNotification,
  ClientConnectionFinalizedNotification,
} from './WebsocketTypes';

export interface RawClientNotification {
  notificationType: NotificationType;
  data: string;
}

export const ParseRawClientNotification = (
  notification: RawClientNotification
): TypedConnectionNotification => {
  const { targetDrive, header, previousServerFileHeader, sender, recipient, identity, ...data } =
    tryJsonParse<Record<string, unknown>>(notification.data);

  if (notification.notificationType === 'inboxItemReceived') {
    return {
      notificationType: notification.notificationType,
      targetDrive,
      data: data,
    } as ClientTransitNotification;
  }

  if (
    ['fileAdded', 'fileDeleted', 'fileModified', 'statisticsChanged'].includes(
      notification.notificationType
    )
  ) {
    return {
      notificationType: notification.notificationType,
      targetDrive: targetDrive,
      header: previousServerFileHeader || header,
      data: data,
    } as ClientFileNotification;
  }

  if (
    ['connectionRequestReceived', 'connectionRequestAccepted'].includes(
      notification.notificationType
    )
  ) {
    return {
      notificationType: notification.notificationType,
      sender: sender,
      recipient: recipient,
      data: data,
    } as ClientConnectionNotification;
  }

  if (['connectionFinalized'].includes(notification.notificationType)) {
    return {
      notificationType: notification.notificationType,
      identity: identity,
      data: data,
    } as ClientConnectionFinalizedNotification;
  }

  if (
    ['deviceHandshakeSuccess', 'deviceConnected', 'deviceDisconnected'].includes(
      notification.notificationType
    )
  ) {
    return {
      notificationType: notification.notificationType,
      data: data,
    } as ClientDeviceNotification;
  }

  if (['appNotificationAdded'].includes(notification.notificationType)) {
    return {
      notificationType: notification.notificationType,

      id: data.id,
      senderId: data.senderId,
      unread: true,
      created: data.timestamp,
      options: data.appNotificationOptions,
    } as AppNotification;
  }

  if (['reactionContentAdded', 'reactionContentDeleted'].includes(notification.notificationType)) {
    return {
      notificationType: notification.notificationType,

      odinId: data.odinId,
      reactionContent: data.reactionContent,
      fileId: data.fileId,
      created: data.created,
    } as ReactionNotification;
  }

  return {
    notificationType: 'unknown',
    data: data,
  } as ClientUnknownNotification;
};

export const parseMessage = async (
  e: MessageEvent,
  sharedSecret: Uint8Array
): Promise<RawClientNotification> => {
  const metaPayload = tryJsonParse<Record<string, unknown>>(e.data);
  if (!metaPayload || !('payload' in metaPayload) || typeof metaPayload.payload !== 'string') {
    console.error('[WebsocketProvider] Invalid message received', e.data);
    throw new Error('Invalid message received');
  }

  const encryptedPayload = tryJsonParse<Record<string, unknown>>(metaPayload.payload);

  if (metaPayload.isEncrypted) {
    if (
      !encryptedPayload ||
      typeof encryptedPayload.data !== 'string' ||
      typeof encryptedPayload.iv !== 'string'
    ) {
      console.error('[WebsocketProvider] Invalid message received for decryption', e.data);
      throw new Error('Invalid message received for decryption');
    }

    return (await decryptData(
      encryptedPayload.data,
      encryptedPayload.iv,
      sharedSecret
    )) as RawClientNotification;
  }

  const decryptedData: unknown = encryptedPayload;
  return decryptedData as RawClientNotification;
};
