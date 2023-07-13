import { isLocalStorageAvailable, jsonStringify64 } from '../../helpers/helpers';
import { ApiType, DotYouClient } from '../DotYouClient';
import { decryptData, encryptData, getRandomIv } from '../InterceptionEncryptionUtil';
import { TargetDrive } from '../core';
import {
  ClientConnectionNotification,
  ClientDeviceNotification,
  ClientFileNotification,
  ClientTransitNotification,
  ClientUnknownNotification,
  Command,
  EstablishConnectionRequest,
  NotificationType,
  TypedConnectionNotification,
} from './NotificationTypes';

let webSocketClient: WebSocket | undefined;
let activeSs: Uint8Array;
let isConnected = false;
const handlers: ((data: TypedConnectionNotification) => void)[] = [];

interface RawClientNotification {
  notificationType: NotificationType;
  data: string;
}

const isDebug = isLocalStorageAvailable() && localStorage.getItem('debug') === '1';

const ParseRawClientNotification = (
  notification: RawClientNotification
): TypedConnectionNotification => {
  const { targetDrive, header, externalFileIdentifier, sender, recipient, ...data } = JSON.parse(
    notification.data
  );

  if (notification.notificationType === 'transitFileReceived') {
    return {
      notificationType: notification.notificationType,
      externalFileIdentifier: externalFileIdentifier,
      data: data,
    } as ClientTransitNotification;
  }

  if (['fileAdded', 'fileDeleted', 'fileModified'].includes(notification.notificationType)) {
    return {
      notificationType: notification.notificationType,
      targetDrive: targetDrive,
      header: header,
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

  return {
    notificationType: 'unknown',
    data: data,
  } as ClientUnknownNotification;
};

export const Subscribe = async (
  dotYouClient: DotYouClient,
  drives: TargetDrive[],
  handler: (data: TypedConnectionNotification) => void
) => {
  const apiType = dotYouClient.getType();
  const sharedSecret = dotYouClient.getSharedSecret();
  if ((apiType !== ApiType.Owner && apiType !== ApiType.App) || !sharedSecret) {
    throw new Error(`NotificationProvider is not supported for ApiType: ${apiType}`);
  }

  activeSs = sharedSecret;

  return new Promise<void>((resolve) => {
    handlers.push(handler);
    if (isDebug) console.debug(`[NotificationProvider] New subscriber (${handlers.length})`);

    if (webSocketClient && isConnected) {
      // Already connected, no need to initiate a new connection
      resolve();
      return;
    }

    const url = `wss://${dotYouClient.getIdentity()}/api/${
      apiType === ApiType.Owner ? 'owner' : 'apps'
    }/v1/notify/ws`;

    webSocketClient = webSocketClient || new WebSocket(url);
    if (isDebug) console.debug(`[NotificationProvider] Client connected`);

    webSocketClient.onopen = () => {
      const connectionRequest: EstablishConnectionRequest = {
        drives: drives,
      };

      Notify(connectionRequest);
    };

    webSocketClient.onmessage = async (e) => {
      const notification: RawClientNotification = await parseMessage(e);

      if (!isConnected) {
        // First message must be acknowledgement of successful handshake
        if (notification.notificationType == 'deviceHandshakeSuccess') {
          if (isDebug) console.debug(`[NotificationProvider] Device handshake success`);
          isConnected = true;
          resolve();
          return;
        }
      }

      if (isDebug) console.debug(`[NotificationProvider] `, notification);

      const parsedNotification = ParseRawClientNotification(notification);
      handlers.map(async (handler) => await handler(parsedNotification));
    };
  });
};

export const Notify = async (command: Command | EstablishConnectionRequest) => {
  if (!webSocketClient) {
    throw new Error('No active client to notify');
  }

  if (isDebug) console.debug(`[NotificationProvider] Send command (${JSON.stringify(command)})`);

  const json = jsonStringify64(command);
  const payload = await encryptData(json, getRandomIv(), activeSs);

  webSocketClient.send(JSON.stringify(payload));
};

const parseMessage = async (e: MessageEvent): Promise<RawClientNotification> => {
  const metaPayload = JSON.parse(e.data);
  const encryptedPayload = JSON.parse(metaPayload.payload);

  const decryptedData = metaPayload.isEncrypted
    ? await decryptData(encryptedPayload.data, encryptedPayload.iv, activeSs)
    : encryptedPayload;

  const notification: RawClientNotification = decryptedData;

  return notification;
};

export const Disconnect = (handler: (data: TypedConnectionNotification) => void) => {
  if (!webSocketClient) {
    throw new Error('No active client to disconnect');
  }

  const index = handlers.indexOf(handler);
  if (index !== -1) {
    handlers.splice(index, 1);

    if (handlers.length === 0 && isConnected) {
      isConnected = false;
      webSocketClient.close(1000, 'Normal Disconnect');
      if (isDebug) console.debug(`[NotificationProvider] Client disconnected`);

      webSocketClient = undefined;
    }
  }
};
