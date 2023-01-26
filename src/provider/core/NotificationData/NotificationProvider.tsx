import { ApiType, ProviderBase, ProviderOptions } from '../ProviderBase';
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

export class NotificationProvider extends ProviderBase {
  constructor(options: ProviderOptions) {
    super(options);
  }

  private ParseNotification(notification: RawClientNotification): TypedConnectionNotification {
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
  }

  async Subscribe(drives: TargetDrive[], handler: (data: TypedConnectionNotification) => void) {
    const apiType = this.getType();
    if (apiType !== ApiType.Owner && apiType !== ApiType.App) {
      throw new Error(`NotificationProvider is not supported for ApiType: ${apiType}`);
    }

    // TODO manage handlers per url;
    // TODO ignore existing connection when filters change;
    return new Promise<void>((resolve) => {
      handlers.push(handler);
      console.log(`Adding new subscriber. Total amount of subscribers now: ${handlers.length}`);

      if (webSocketClient && isConnected) {
        // Already connected, no need to initiate a new connection
        resolve();
        return;
      }

      const url = `wss://${window.location.hostname}/api/${
        apiType === ApiType.Owner ? 'owner' : 'apps'
      }/v1/notify/ws`;

      webSocketClient = webSocketClient || new WebSocket(url);

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
            isConnected = true;
            resolve();
            return;
          }
        }

        const parsedNotification = this.ParseNotification(notification);
        handlers.map(async (handler) => await handler(parsedNotification));
      };
    });
  }

  Notify = (command: Command) => {
    if (!webSocketClient) {
      throw new Error('No active client to notify');
    }

    console.log('Sending command:', JSON.stringify(command));
    webSocketClient.send(JSON.stringify(command));
  };

  Disconnect = (handler: (data: TypedConnectionNotification) => void) => {
    if (!webSocketClient) {
      throw new Error('No active client to disconnect');
    }

    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);

      if (handlers.length === 0 && isConnected) {
        isConnected = false;
        webSocketClient.close(1000, 'Normal Disconnect');

        webSocketClient = undefined;
      }
    }
  };
}
