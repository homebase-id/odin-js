import { ApiType, DotYouClient } from '../DotYouClient';
import { TargetDrive } from '../DriveData/DriveTypes';
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
let isConnected = false;
const handlers: ((data: TypedConnectionNotification) => void)[] = [];

interface RawClientNotification {
  notificationType: NotificationType;
  data: string;
}

const isDebug = localStorage.getItem('debug') === '1';

const ParseNotification = (notification: RawClientNotification): TypedConnectionNotification => {
  const { targetDrive, header, externalFileIdentifier, sender, ...data } = JSON.parse(
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
  if (apiType !== ApiType.Owner && apiType !== ApiType.App) {
    throw new Error(`NotificationProvider is not supported for ApiType: ${apiType}`);
  }

  // TODO manage handlers per url;
  // TODO ignore existing connection when filters change;
  return new Promise<void>((resolve) => {
    handlers.push(handler);
    if (isDebug) console.debug(`[NotificationProvider] New subscriber (${handlers.length})`);

    if (webSocketClient && isConnected) {
      // Already connected, no need to initiate a new connection
      resolve();
      return;
    }

    const url = `wss://${window.location.hostname}/api/${
      apiType === ApiType.Owner ? 'owner' : 'apps'
    }/v1/notify/ws`;

    webSocketClient = webSocketClient || new WebSocket(url);
    if (isDebug) console.debug(`[NotificationProvider] Client connected`);

    webSocketClient.onopen = () => {
      const connectionRequest: EstablishConnectionRequest = {
        drives: drives,
      };

      webSocketClient?.send(JSON.stringify(connectionRequest));
    };

    webSocketClient.onmessage = async (e) => {
      const notification: RawClientNotification = JSON.parse(e.data);

      if (!isConnected) {
        // First message must be acknowledgement of successful handshake
        if (notification.notificationType == 'deviceHandshakeSuccess') {
          if (isDebug) console.debug(`[NotificationProvider] Device handshake success`);
          isConnected = true;
          resolve();
          return;
        }
      }

      const parsedNotification = ParseNotification(notification);
      handlers.map(async (handler) => await handler(parsedNotification));
    };
  });
};

export const Notify = (command: Command) => {
  if (!webSocketClient) {
    throw new Error('No active client to notify');
  }

  if (isDebug) console.debug(`[NotificationProvider] Send command (${JSON.stringify(command)})`);
  webSocketClient.send(JSON.stringify(command));
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
