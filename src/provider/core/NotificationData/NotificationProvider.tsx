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

let webSocketClient: WebSocket;
let isConnected = false;

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

    return new Promise<void>((resolve) => {
      const identity = window.location.hostname;
      const endpoint = `/api/${apiType === ApiType.Owner ? 'owner' : 'apps'}/v1/notify/ws`;

      const url = `wss://${identity}${endpoint}`;
      webSocketClient = new WebSocket(url);

      const connectionRequest: EstablishConnectionRequest = {
        drives: drives,
      };

      webSocketClient.onopen = () => {
        webSocketClient.send(JSON.stringify(connectionRequest));
      };

      webSocketClient.onmessage = (e) => {
        const notification: RawClientNotification = JSON.parse(e.data);

        if (!isConnected) {
          // First message must be acknowledgement of successful handshake
          if (notification.notificationType == 'deviceHandshakeSuccess') {
            isConnected = true;
            resolve();
            return;
          }
        }

        handler(this.ParseNotification(notification));
      };
    });
  }

  Notify = (command: Command) => {
    console.log('Sending command:', JSON.stringify(command));
    webSocketClient.send(JSON.stringify(command));
  };

  Disconnect = () => {
    if (!webSocketClient) {
      console.log('No Client');
      return;
    }

    webSocketClient.close(1000, 'Normal Disconnect');
  };
}
