import { hasDebugFlag, jsonStringify64, tryJsonParse } from '../../helpers/helpers';
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
  AppNotification,
} from './WebsocketTypes';

let webSocketClient: WebSocket | undefined;
let activeSs: Uint8Array;

let isConnected = false;
const PING_INTERVAL = 1000 * 5 * 1;

let pingInterval: NodeJS.Timeout | undefined;
let lastPong: number | undefined;

let reconnectTimeout: NodeJS.Timeout | undefined;

const subscribers: {
  handler: (data: TypedConnectionNotification) => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}[] = [];

interface RawClientNotification {
  notificationType: NotificationType;
  data: string;
}

const isDebug = hasDebugFlag();

const ParseRawClientNotification = (
  notification: RawClientNotification
): TypedConnectionNotification => {
  const { targetDrive, header, sender, recipient, ...data } = tryJsonParse<Record<string, unknown>>(
    notification.data
  );

  if (notification.notificationType === 'inboxItemReceived') {
    return {
      notificationType: notification.notificationType,
      targetDrive,
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

  // eslint-disable-next-line no-async-promise-executor
  return new Promise<void>(async (resolve, reject) => {
    if (apiType === ApiType.App) {
      // we need to preauth before we can connect
      await dotYouClient
        .createAxiosClient()
        .post('/notify/preauth', undefined, {
          validateStatus: () => true,
        })
        .catch((error) => {
          console.error({ error });
          reject('[WebsocketProvider] Preauth failed');
        });
    }

    const url = `wss://${dotYouClient.getRoot().split('//')[1]}/api/${
      apiType === ApiType.Owner ? 'owner' : 'apps'
    }/v1/notify/ws`;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    webSocketClient = new WebSocket(url, undefined, args);
    if (isDebug) console.debug(`[NotificationProvider] Client connected`);

    webSocketClient.onopen = () => {
      const establishConnectionRequest: EstablishConnectionRequest = {
        drives,
        waitTimeMs: 2000,
        batchSize: 1,
      };

      Notify({
        command: 'establishConnectionRequest',
        data: JSON.stringify(establishConnectionRequest),
      });
    };

    const setupPing = () => {
      lastPong = Date.now();
      pingInterval = setInterval(() => {
        if (lastPong && Date.now() - lastPong > PING_INTERVAL * 2) {
          // 2 ping intervals have passed without a pong, reconnect
          if (isDebug) console.debug(`[NotificationProvider] Ping timeout`);
          ReconnectSocket(dotYouClient, drives, args);
          return;
        }
        Notify({
          command: 'ping',
        } as WebsocketCommand);
      }, PING_INTERVAL);
    };

    webSocketClient.onmessage = async (e) => {
      const notification: RawClientNotification = await parseMessage(e);

      if (notification.notificationType === 'error') {
        console.warn('[NotificationProvider] Error:', notification.data);
      }

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
    };

    webSocketClient.onclose = (e) => {
      if (isDebug) {
        if (e.wasClean) {
          console.debug('[NotificationProvider] Connection closed cleanly', e);
        } else {
          console.debug('[NotificationProvider] Connection closed unexpectedly', e);
        }
      }

      subscribers.map((subscriber) => subscriber.onDisconnect && subscriber.onDisconnect());
      ReconnectSocket(dotYouClient, drives, args);
    };
  });
};

const ReconnectSocket = async (
  dotYouClient: DotYouClient,
  drives: TargetDrive[],
  args?: unknown // Extra parameters to pass to WebSocket constructor; Only applicable for React Native...; TODO: Remove this
) => {
  if (reconnectTimeout) return;

  reconnectTimeout = setTimeout(async () => {
    reconnectTimeout = undefined;
    webSocketClient = undefined;
    lastPong = undefined;
    isConnected = false;
    clearInterval(pingInterval);

    if (isDebug) console.debug('[NotificationProvider] Reconnecting');

    await ConnectSocket(dotYouClient, drives, args);
    subscribers.map((subscriber) => subscriber.onReconnect && subscriber.onReconnect());
  }, 5000);
};

const DisconnectSocket = async () => {
  try {
    if (!webSocketClient) console.warn('No active client to disconnect');
    else webSocketClient.close(1000, 'Normal Disconnect');
  } catch (e) {
    // Ignore any errors on close, as we always want to clean up
  }
  if (isDebug) console.debug(`[NotificationProvider] Client disconnected`);

  isConnected = false;
  webSocketClient = undefined;
  clearInterval(pingInterval);

  // if there are still subscribes, inform them that the connection was closed
  subscribers.map((subscriber) => subscriber.onDisconnect && subscriber.onDisconnect());
  subscribers.length = 0;
};

export const Subscribe = async (
  dotYouClient: DotYouClient,
  drives: TargetDrive[],
  handler: (data: TypedConnectionNotification) => void,
  onDisconnect?: () => void,
  onReconnect?: () => void,
  args?: unknown // Extra parameters to pass to WebSocket constructor; Only applicable for React Native...; TODO: Remove this
) => {
  const apiType = dotYouClient.getType();
  const sharedSecret = dotYouClient.getSharedSecret();
  if ((apiType !== ApiType.Owner && apiType !== ApiType.App) || !sharedSecret) {
    throw new Error(`NotificationProvider is not supported for ApiType: ${apiType}`);
  }

  activeSs = sharedSecret;
  subscribers.push({ handler, onDisconnect, onReconnect });

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
      activeSs
    )) as RawClientNotification;
  }

  const decryptedData: unknown = encryptedPayload;
  return decryptedData as RawClientNotification;
};
