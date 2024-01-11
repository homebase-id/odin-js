import { isLocalStorageAvailable, jsonStringify64, tryJsonParse } from '../../helpers/helpers';
import { ApiType, DotYouClient } from '../DotYouClient';
import { decryptData, encryptData, getRandomIv } from '../InterceptionEncryptionUtil';
import { TargetDrive } from '../core';
import {
  ClientConnectionNotification,
  ClientDeviceNotification,
  ClientFileNotification,
  ClientTransitNotification,
  ClientUnknownNotification,
  WebsocketCommand,
  EstablishConnectionRequest,
  NotificationType,
  TypedConnectionNotification,
} from './NotificationTypes';

let webSocketClient: WebSocket | undefined;
let activeSs: Uint8Array;

let isConnected = false;

const PING_INTERVAL = 1000 * 15 * 1;

let pingInterval: NodeJS.Timeout | undefined;
let lastPong: number | undefined;

const subscribers: {
  handler: (data: TypedConnectionNotification) => void;
  onDisconnect?: () => void;
}[] = [];

interface RawClientNotification {
  notificationType: NotificationType;
  data: string;
}

const isDebug = isLocalStorageAvailable() && localStorage.getItem('debug') === '1';

const ParseRawClientNotification = (
  notification: RawClientNotification
): TypedConnectionNotification => {
  const { targetDrive, header, externalFileIdentifier, sender, recipient, ...data } =
    tryJsonParse<any>(notification.data);

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

// Socket connection can be tricky with multiple subscribers; For now, we only support multiple subscribers with the same drives;
const ConnectSocket = async (
  dotYouClient: DotYouClient,
  drives: TargetDrive[],
  args?: unknown // Extra parameters to pass to WebSocket constructor; Only applicable for React Native...; TODO: Remove this
) => {
  if (webSocketClient) throw new Error('Socket already connected');

  const apiType = dotYouClient.getType();
  return new Promise<void>((resolve) => {
    const url = `wss://${dotYouClient.getIdentity()}/api/${
      apiType === ApiType.Owner ? 'owner' : 'apps'
    }/v1/notify/ws`;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    webSocketClient = new WebSocket(url, undefined, args);
    if (isDebug) console.debug(`[NotificationProvider] Client connected`);

    webSocketClient.onopen = () => {
      const connectionRequest: EstablishConnectionRequest = {
        drives: drives,
      };

      Notify(connectionRequest);
    };

    const setupPing = () => {
      lastPong = Date.now();
      pingInterval = setInterval(() => {
        if (lastPong && Date.now() - lastPong > PING_INTERVAL * 2) {
          // 2 ping intervals have passed without a pong, force disconnect
          if (isDebug) console.debug(`[NotificationProvider] Ping timeout`);
          DisconnectSocket();
          return;
        }
        Notify({
          command: 'ping',
        });
      }, PING_INTERVAL);
    };

    webSocketClient.onmessage = async (e) => {
      const notification: RawClientNotification = await parseMessage(e);

      if (!isConnected) {
        // First message must be acknowledgement of successful handshake
        if (notification.notificationType == 'deviceHandshakeSuccess') {
          if (isDebug) console.debug(`[NotificationProvider] Device handshake success`);
          isConnected = true;
          setupPing();
          resolve();
          return;
        }
      }

      if (isDebug) console.debug(`[NotificationProvider] `, notification);
      if (notification.notificationType === 'pong') lastPong = Date.now();

      const parsedNotification = ParseRawClientNotification(notification);
      subscribers.map(async (subscriber) => await subscriber.handler(parsedNotification));
    };

    webSocketClient.onerror = (e) => {
      console.error('[NotificationProvider]', e);
      DisconnectSocket();
    };

    webSocketClient.onclose = (e) => {
      if (isDebug) console.debug('[NotificationProvider] Connection closed');
      DisconnectSocket();
    };
  });
};

const DisconnectSocket = async () => {
  if (!webSocketClient) throw new Error('No active client to disconnect');

  try {
    webSocketClient.close(1000, 'Normal Disconnect');
  } catch (e) {
    // Ignore any errors on close, as we always want to clean up
  }
  if (isDebug) console.debug(`[NotificationProvider] Client disconnected`);

  isConnected = false;
  webSocketClient = undefined;
  clearInterval(pingInterval);

  // if there are still subscribes, inform them that the connection was closed
  subscribers.map((subscriber) => subscriber.onDisconnect && subscriber.onDisconnect());
};

export const Subscribe = async (
  dotYouClient: DotYouClient,
  drives: TargetDrive[],
  handler: (data: TypedConnectionNotification) => void,
  onDisconnect?: () => void,
  args?: unknown // Extra parameters to pass to WebSocket constructor; Only applicable for React Native...; TODO: Remove this
) => {
  const apiType = dotYouClient.getType();
  const sharedSecret = dotYouClient.getSharedSecret();
  if ((apiType !== ApiType.Owner && apiType !== ApiType.App) || !sharedSecret) {
    throw new Error(`NotificationProvider is not supported for ApiType: ${apiType}`);
  }

  activeSs = sharedSecret;
  subscribers.push({ handler, onDisconnect });

  if (isDebug) console.debug(`[NotificationProvider] New subscriber (${subscribers.length})`);

  // Already connected, no need to initiate a new connection
  if (webSocketClient) return Promise.resolve();
  return ConnectSocket(dotYouClient, drives, args);
};

export const Unsubscribe = (handler: (data: TypedConnectionNotification) => void) => {
  const index = subscribers.findIndex((subscriber) => subscriber.handler === handler);
  if (index !== -1) {
    subscribers.splice(index, 1);

    if (subscribers.length === 0 && isConnected) {
      DisconnectSocket();
    }
  }
};

export const Notify = async (command: WebsocketCommand | EstablishConnectionRequest) => {
  if (!webSocketClient) throw new Error('No active websocket to message across');
  if (isDebug) console.debug(`[NotificationProvider] Send command (${JSON.stringify(command)})`);

  const json = jsonStringify64(command);
  const payload = await encryptData(json, getRandomIv(), activeSs);

  webSocketClient.send(JSON.stringify(payload));
};

const parseMessage = async (e: MessageEvent): Promise<RawClientNotification> => {
  const metaPayload = tryJsonParse<any>(e.data);
  const encryptedPayload = tryJsonParse<any>(metaPayload.payload);

  const decryptedData = metaPayload.isEncrypted
    ? await decryptData(encryptedPayload.data, encryptedPayload.iv, activeSs)
    : encryptedPayload;

  const notification: RawClientNotification = decryptedData;

  return notification;
};
