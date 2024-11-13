import { ApiType, DotYouClient } from '../../core/DotYouClient';
import { TargetDrive } from '../../core/DriveData/File/DriveFileTypes';
import { encryptData, getRandomIv } from '../../core/InterceptionEncryptionUtil';
import {
  RawClientNotification,
  parseMessage,
  ParseRawClientNotification,
} from '../../core/WebsocketData/WebsocketHelpers';
import {
  EstablishConnectionRequest,
  TypedConnectionNotification,
  WebsocketCommand,
} from '../../core/WebsocketData/WebsocketTypes';
import {
  hasDebugFlag,
  jsonStringify64,
  drivesEqual,
  base64ToUint8Array,
} from '../../helpers/helpers';

let webSocketClient: WebSocket | undefined;
let activeSs: Uint8Array;

let subscribedDrives: TargetDrive[] | undefined;

let connectPromise: Promise<void> | undefined = undefined;
let isConnected = false;
const PING_INTERVAL = 1000 * 5 * 1;

let pingInterval: NodeJS.Timeout | undefined;
let lastPong: number | undefined;

let reconnectTimeout: NodeJS.Timeout | undefined;

const subscribers: {
  handler: (dotYouClient: DotYouClient, data: TypedConnectionNotification) => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}[] = [];

const isDebug = hasDebugFlag();

const ConnectSocket = async (
  dotYouClient: DotYouClient,
  odinId: string,
  drives: TargetDrive[],
  args?: unknown // Extra parameters to pass to WebSocket constructor; Only applicable for React Native...;
) => {
  if (webSocketClient) throw new Error('Socket already connected');

  // We're already connecting, return the existing promise
  if (connectPromise) return connectPromise;
  // eslint-disable-next-line no-async-promise-executor
  connectPromise = new Promise<void>(async (resolve, reject) => {
    subscribedDrives = drives;

    // we need to preauth before we can connect
    const tokenToConnectOverPeer = await dotYouClient
      .createAxiosClient()
      .post<{
        authenticationToken64: string;
        sharedSecret: string;
      }>(
        '/notify/peer/token',
        {
          identity: odinId,
        },
        {
          validateStatus: () => true,
        }
      )
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        console.error({ error });
        return null;
      });

    if (!tokenToConnectOverPeer) {
      reject('[WebsocketProviderOverPeer] Preauth failed');
      return;
    }

    activeSs = base64ToUint8Array(tokenToConnectOverPeer.sharedSecret);
    const directGuestClient = new DotYouClient({
      api: ApiType.Guest,
      identity: odinId,
      headers: {
        SUB32: tokenToConnectOverPeer.authenticationToken64,
      },
      sharedSecret: activeSs,
    });

    // we need to preauth before we can connect
    await directGuestClient
      .createAxiosClient()
      .post('/notify/peer/preauth', undefined, {
        validateStatus: () => true,
      })
      .catch((error) => {
        console.error({ error });
        reject('[WebsocketProviderOverPeer] Preauth failed');
      });

    const url = `wss://${directGuestClient.getRoot().split('//')[1]}/api/guest/v1/notify/peer/ws`;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    webSocketClient = new WebSocket(url, undefined, args);
    if (isDebug) console.debug(`[WebsocketProviderOverPeer] Client connected`);

    webSocketClient.onopen = () => {
      const establishConnectionRequest: EstablishConnectionRequest = {
        drives,
        waitTimeMs: 2000,
        batchSize: 1,
      };

      NotifyOverPeer({
        command: 'establishConnectionRequest',
        data: JSON.stringify(establishConnectionRequest),
      });
    };

    const setupPing = () => {
      lastPong = Date.now();
      pingInterval = setInterval(() => {
        if (lastPong && Date.now() - lastPong > PING_INTERVAL * 2) {
          // 2 ping intervals have passed without a pong, reconnect
          if (isDebug) console.debug(`[WebsocketProviderOverPeer] Ping timeout`);
          ReconnectSocket(dotYouClient, odinId, drives, args);
          return;
        }
        NotifyOverPeer({
          command: 'ping',
        } as WebsocketCommand);
      }, PING_INTERVAL);
    };

    webSocketClient.onmessage = async (e) => {
      const notification: RawClientNotification = await parseMessage(e, activeSs);

      if (notification.notificationType === 'error') {
        console.warn('[WebsocketProviderOverPeer] Error:', notification.data);
      }

      if (!isConnected) {
        // First message must be acknowledgement of successful handshake
        if (notification.notificationType == 'deviceHandshakeSuccess') {
          if (isDebug) console.debug(`[WebsocketProviderOverPeer] Device handshake success`);
          isConnected = true;
          setupPing();
          resolve();
          return;
        }
      }

      if (isDebug) console.debug(`[WebsocketProviderOverPeer] `, notification);
      if (notification.notificationType === 'pong') lastPong = Date.now();

      const parsedNotification = ParseRawClientNotification(notification);
      subscribers.map(
        async (subscriber) => await subscriber.handler(directGuestClient, parsedNotification)
      );
    };

    webSocketClient.onerror = (e) => {
      console.error('[NotificationProvider]', e);
    };

    webSocketClient.onclose = (e) => {
      if (isDebug) {
        if (e.wasClean) {
          console.debug('[WebsocketProviderOverPeer] Connection closed cleanly', e);
        } else {
          console.debug('[WebsocketProviderOverPeer] Connection closed unexpectedly', e);
        }
      }

      subscribers.map((subscriber) => subscriber.onDisconnect && subscriber.onDisconnect());
      ReconnectSocket(dotYouClient, odinId, drives, args);
    };
  });
};

const ReconnectSocket = async (
  dotYouClient: DotYouClient,
  odinId: string,
  drives: TargetDrive[],
  args?: unknown // Extra parameters to pass to WebSocket constructor; Only applicable for React Native...; TODO: Remove this
) => {
  if (reconnectTimeout) return;

  reconnectTimeout = setTimeout(async () => {
    reconnectTimeout = undefined;
    webSocketClient = undefined;
    lastPong = undefined;
    isConnected = false;
    connectPromise = undefined;
    clearInterval(pingInterval);

    if (isDebug) console.debug('[WebsocketProviderOverPeer] Reconnecting');

    await ConnectSocket(dotYouClient, odinId, drives, args);
    subscribers.map((subscriber) => subscriber.onReconnect && subscriber.onReconnect());
  }, 5000);
};

const DisconnectSocket = async () => {
  try {
    if (!webSocketClient) console.warn('No active client to disconnect');
    else webSocketClient.close(1000, 'Normal Disconnect');
  } catch {
    // Ignore any errors on close, as we always want to clean up
  }
  if (isDebug) console.debug(`[WebsocketProviderOverPeer] Client disconnected`);

  isConnected = false;
  connectPromise = undefined;
  webSocketClient = undefined;
  clearInterval(pingInterval);

  // if there are still subscribes, inform them that the connection was closed
  subscribers.map((subscriber) => subscriber.onDisconnect && subscriber.onDisconnect());
  subscribers.length = 0;
};

export const SubscribeOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
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
    throw new Error(`NotificationProvider is not supported for ApiType: ${apiType}`);
  }

  activeSs = sharedSecret;
  subscribers.push({ handler, onDisconnect, onReconnect });

  if (isDebug)
    console.debug(`[WebsocketProviderOverPeer] New subscriber (${subscribers.length})`, refId);

  if (
    subscribedDrives &&
    (subscribedDrives.length !== drives.length ||
      drives.some((drive) => !subscribedDrives?.find((d) => drivesEqual(d, drive))))
  ) {
    throw new Error('Socket already connected with different drives');
  }

  // Already connected, no need to initiate a new connection
  if (webSocketClient) return Promise.resolve();
  return ConnectSocket(dotYouClient, odinId, drives, args);
};

export const UnsubscribeOverPeer = (
  handler: (dotYouClient: DotYouClient, data: TypedConnectionNotification) => void
) => {
  const index = subscribers.findIndex((subscriber) => subscriber.handler === handler);
  if (index !== -1) {
    subscribers.splice(index, 1);

    if (subscribers.length === 0 && isConnected) {
      DisconnectSocket();
    }
  }
};

export const NotifyOverPeer = async (command: WebsocketCommand | EstablishConnectionRequest) => {
  if (!webSocketClient) throw new Error('No active websocket to message across');
  if (isDebug)
    console.debug(`[WebsocketProviderOverPeer] Send command (${JSON.stringify(command)})`);

  const json = jsonStringify64(command);
  const payload = await encryptData(json, getRandomIv(), activeSs);

  webSocketClient.send(JSON.stringify(payload));
};
