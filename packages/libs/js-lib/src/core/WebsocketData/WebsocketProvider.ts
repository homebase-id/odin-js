import { hasDebugFlag, jsonStringify64, drivesEqual } from '../../helpers/helpers';
import { ApiType, DotYouClient } from '../DotYouClient';
import { encryptData, getRandomIv } from '../InterceptionEncryptionUtil';
import { TargetDrive } from '../core';
import {
  parseMessage,
  ParseRawClientNotification,
  RawClientNotification,
} from './WebsocketHelpers';
import {
  WebsocketCommand,
  EstablishConnectionRequest,
  TypedConnectionNotification,
} from './WebsocketTypes';
import { onlineManager } from '@tanstack/react-query';

let webSocketClient: WebSocket | undefined;
let activeSs: Uint8Array;

let subscribedDrives: TargetDrive[] | undefined;

let connectPromise: Promise<void> | undefined = undefined;
let isHandshaked = false;
const PING_INTERVAL = 1000 * 5 * 1;

let pingInterval: NodeJS.Timeout | undefined;
let lastPong: number | undefined;

let reconnectCounter = 0;
let reconnectPromise: Promise<void> | undefined = undefined;

const subscribers: {
  handler: (dotYouClient: DotYouClient, data: TypedConnectionNotification) => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}[] = [];

const isDebug = hasDebugFlag();

const ConnectSocket = async (
  dotYouClient: DotYouClient,
  drives: TargetDrive[],
  args?: unknown // Extra parameters to pass to WebSocket constructor; Only applicable for React Native...;
) => {
  if (webSocketClient) throw new Error('Socket already connected');

  const apiType = dotYouClient.getType();

  // We're already connecting, return the existing promise
  if (connectPromise) return connectPromise;
  // eslint-disable-next-line no-async-promise-executor
  connectPromise = new Promise<void>(async (resolve, reject) => {
    subscribedDrives = drives;

    if (!onlineManager.isOnline()) {
      if (isDebug) console.debug('[WebsocketProvider] Offline, ConnectSocket: skipping connection attempt');
      reconnectPromise = undefined;
      reject('[WebsocketProvider] Offline, cannot connect');
      return;
    }

    if (apiType === ApiType.App) {
      // we need to preauth before we can connect
      await dotYouClient
        .createAxiosClient()
        .post('/notify/preauth', undefined, {
          validateStatus: () => true,
        })
        .catch(() => {
          reconnectPromise = undefined;
          reject('[WebsocketProvider] Preauth failed');
        });
    }

    const url = `wss://${dotYouClient.getRoot().split('//')[1]}/api/${
      apiType === ApiType.Owner ? 'owner' : 'apps'
    }/v1/notify/ws`;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    webSocketClient = new WebSocket(url, undefined, args);
    if (isDebug) console.debug(`[WebsocketProvider] Client connected`);
    reconnectPromise = undefined;
    isHandshaked = false;

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
          if (!onlineManager.isOnline())
          {
            if (isDebug) console.debug(`[WebsocketProvider] Offline, ConnectSocket: skipping ping`);
            return;
          }

          // 2 ping intervals have passed without a pong, reconnect
          if (isDebug) console.debug(`[WebsocketProvider] Ping timeout`);
          ReconnectSocket(dotYouClient, drives, args);
          return;
        }
        Notify({
          command: 'ping',
        } as WebsocketCommand);
      }, PING_INTERVAL);
    };

    webSocketClient.onmessage = async (e) => {
      const notification: RawClientNotification = await parseMessage(e, activeSs);

      if (notification.notificationType === 'error') {
        console.warn('[WebsocketProvider] Error:', notification.data);
      }

      if (!isHandshaked) {
        // First message must be acknowledgement of successful handshake
        if (notification.notificationType == 'deviceHandshakeSuccess') {
          if (isDebug) console.debug(`[WebsocketProvider] Device handshake success`);
          isHandshaked = true;
          reconnectCounter = 0;
          setupPing();
          resolve();
          return;
        }
      }

      if (isDebug) console.debug(`[WebsocketProvider] `, notification);
      if (notification.notificationType === 'pong') lastPong = Date.now();

      const parsedNotification = ParseRawClientNotification(notification);
      subscribers.map(
        async (subscriber) => await subscriber.handler(dotYouClient, parsedNotification)
      );
    };

    webSocketClient.onerror = (e) => {
      console.error('[WebsocketProvider]', e);
    };

    webSocketClient.onclose = (e) => {
      if (isDebug) {
        if (e.wasClean) {
          console.debug('[WebsocketProvider] Connection closed cleanly', e);
        } else {
          console.debug('[WebsocketProvider] Connection closed unexpectedly', e);
        }
      }

      ReconnectSocket(dotYouClient, drives, args);
    };
  });

  return connectPromise;
};

const ReconnectSocket = async (
  dotYouClient: DotYouClient,
  drives: TargetDrive[],
  args?: unknown // Extra parameters to pass to WebSocket constructor; Only applicable for React Native...; TODO: Remove this
) => {
  if (reconnectPromise) return;

  reconnectPromise = new Promise<void>((resolve, reject) => {
    if (isDebug) console.debug('[WebsocketProvider] Reconnecting - Force disconnect');
    reconnectCounter++;
    subscribers.map((subscriber) => subscriber.onDisconnect && subscriber.onDisconnect());

    if (webSocketClient) webSocketClient.close(1000, 'Disconnect after timeout');
    webSocketClient = undefined;
    lastPong = undefined;
    connectPromise = undefined;
    clearInterval(pingInterval);

    // Delay the reconnect to avoid a tight loop on network issues
    setTimeout(async () => {
      if (!onlineManager.isOnline()) {
        if (isDebug) console.debug(`[WebsocketProvider] Offline, ReconnectSocket: skipping reconnect`);
        reconnectPromise = undefined;
        resolve();
        return;
      }

      if (isDebug) console.debug('[WebsocketProvider] Reconnecting - Delayed reconnect');

      try {
        await ConnectSocket(dotYouClient, drives, args);
      } catch (e) {
        console.error('[WebsocketProvider] Reconnect failed', e);
        reject();

        ReconnectSocket(dotYouClient, drives, args);
        return;
      }
      subscribers.map((subscriber) => subscriber.onReconnect && subscriber.onReconnect());

      resolve();
    }, Math.min(500 * reconnectCounter, 5000)); //500ms*n, 5s delay max
  });
};

const DisconnectSocket = async () => {
  try {
    if (!webSocketClient) console.warn('No active client to disconnect');
    else webSocketClient.close(1000, 'Normal Disconnect');
  } catch {
    // Ignore any errors on close, as we always want to clean up
  }
  if (isDebug) console.debug(`[WebsocketProvider] Client disconnected`);
  isHandshaked = false;
  connectPromise = undefined;
  webSocketClient = undefined;
  clearInterval(pingInterval);

  // if there are still subscribes, inform them that the connection was closed
  subscribers.map((subscriber) => subscriber.onDisconnect && subscriber.onDisconnect());
  subscribers.length = 0;
};

export const Subscribe = async (
  dotYouClient: DotYouClient,
  drives: TargetDrive[],
  handler: (dotYouClient: DotYouClient, data: TypedConnectionNotification) => void,
  onDisconnect?: () => void,
  onReconnect?: () => void,
  args?: unknown, // Extra parameters to pass to WebSocket constructor; Only applicable for React Native...; TODO: Remove this,
  refId?: string
): Promise<void> => {
  const apiType = dotYouClient.getType();
  const sharedSecret = dotYouClient.getSharedSecret();
  if ((apiType !== ApiType.Owner && apiType !== ApiType.App) || !sharedSecret) {
    throw new Error(`[WebsocketProviderOverPeer] is not supported for ApiType: ${apiType}`);
  }

  activeSs = sharedSecret;
  if (subscribers.some((subscriber) => subscriber.handler === handler)) return;

  if (!onlineManager.isOnline()) {
    if (isDebug) console.debug('[WebsocketProvider] Offline, Subscribe: skipping subscription connection');
    return Promise.resolve();
  }

  subscribers.push({ handler, onDisconnect, onReconnect });
  if (isDebug) console.debug(`[WebsocketProvider] New subscriber (${subscribers.length})`, refId);

  if (
    subscribedDrives &&
    (subscribedDrives.length !== drives.length ||
      drives.some((drive) => !subscribedDrives?.find((d) => drivesEqual(d, drive))))
  ) {
    throw new Error('Socket already connected with different drives');
  }

  // Already connected, no need to initiate a new connection
  if (webSocketClient) return Promise.resolve();
  return ConnectSocket(dotYouClient, drives, args);
};

export const Unsubscribe = (
  handler: (dotYouClient: DotYouClient, data: TypedConnectionNotification) => void
) => {
  const index = subscribers.findIndex((subscriber) => subscriber.handler === handler);
  if (index !== -1) {
    subscribers.splice(index, 1);

    if (subscribers.length === 0 && isHandshaked) {
      DisconnectSocket();
    }
  }
};

export const Notify = async (command: WebsocketCommand) => {
  if (!webSocketClient) throw new Error('No active websocket to message across');

  if (!onlineManager.isOnline()) {
    if (isDebug) console.debug('[WebsocketProvider] Offline, Notify: skipping notify');
    return;
  }

  if (isDebug) console.debug(`[WebsocketProvider] Send command (${JSON.stringify(command)})`);

  const json = jsonStringify64(command);
  const payload = await encryptData(json, getRandomIv(), activeSs);

  webSocketClient.send(JSON.stringify(payload));
};
