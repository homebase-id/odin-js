/* eslint-disable @typescript-eslint/no-unused-vars */

import ActionButton from '../../components/ui/Buttons/ActionButton';
import { DomainHighlighter } from '@youfoundation/common-app';
import { PageMeta } from '@youfoundation/common-app';
import CollapsableSection from '../../components/ui/Sections/CollapsableSection';
import {
  ApiType,
  DotYouClient,
  getRandom16ByteArray,
  jsonStringify64,
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  stringToUint8Array,
  TargetDrive,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
} from '@youfoundation/js-lib';
import { useState } from 'react';
import useAuth from '../../hooks/auth/useAuth';

interface EstablishConnectionRequest {
  //List of drives for which I want notifications
  drives: TargetDrive[];
}

interface ClientNotification {
  notificationType: string;
  data: string;
}

const sender = window.location.hostname;
const recipient = sender === 'frodo.digital' ? 'samwise.digital' : 'frodo.digital';

const DeviceHandshakeSuccess = 'deviceHandshakeSuccess';
const DeviceConnected = 'deviceConnected';
const DeviceDisconnected = 'deviceDisconnected';
const FileAdded = 'fileAdded';
const FileDeleted = 'fileDeleted';
const FileModified = 'fileModified';
const ConnectionRequestReceived = 'connectionRequestReceived';
const ConnectionRequestAccepted = 'connectionRequestAccepted';
const TransitFileReceived = 'transitFileReceived';

let webSocketClient: WebSocket;

const chatDrive: TargetDrive = {
  alias: '9ff813aff2d61e2f9b9db189e72d1a11',
  type: '66ea8355ae4155c39b5a719166b510e3',
};

const UiDemo = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [statusText, setStatusText] = useState('n/a');
  const dotYouClient = useAuth().getDotYouClient();

  function establishNotificationSocket() {
    const identity = window.location.hostname;
    // const webSocketClient = new WebSocket(`wss://${identity}/api/apps/v1/notify/ws`);
    const url = `wss://${identity}/api/owner/v1/notify/ws`;
    console.log('Connecting to:', url);

    webSocketClient = new WebSocket(url);

    const establishConnection: EstablishConnectionRequest = {
      drives: [chatDrive],
    };

    webSocketClient.onopen = (e) => {
      webSocketClient.send(JSON.stringify(establishConnection));
    };

    webSocketClient.onmessage = (e) => {
      const notification: ClientNotification = JSON.parse(e.data);

      if (!isConnected) {
        //first message must be acknowledgement of successful handshake
        if (notification.notificationType == DeviceHandshakeSuccess) {
          console.log('Socket connected');
          setIsConnected(true);
          return;
        }
      }

      const data = JSON.parse(notification.data);
      console.log('Notification Received:', notification.notificationType);
      console.log('Notification Data', data);

      if (notification.notificationType === TransitFileReceived) {
        console.log(
          'Replying to TransitFileReceived by sending processTransitInstructions for the targetDrive'
        );

        sendSocketCommand({
          command: 'processTransitInstructions',
          data: JSON.stringify(data.externalFileIdentifier),
        });
      }

      setStatusText(
        `Notification Type received: ${notification.notificationType}. See console for more`
      );
    };
  }

  function sendSocketCommand(command: unknown) {
    console.log('Sending command:', command);

    webSocketClient.send(JSON.stringify(command));
  }

  async function sendFile() {
    // const targetDrive: TargetDrive = {
    //   alias: toGuidId("notification_test_drive"),
    //   type: toGuidId("notification_test_drive_type")
    // };
    //
    // await client.driveProvider.EnsureDrive(targetDrive, "Notification Test", "", false);

    const instructionSet: UploadInstructionSet = {
      transferIv: getRandom16ByteArray(),
      storageOptions: {
        overwriteFileId: undefined,
        drive: chatDrive,
      },
      transitOptions: {
        recipients: [recipient],
        schedule: ScheduleOptions.SendNowAwaitResponse,
        useGlobalTransitId: false,
        sendContents: SendContents.HeaderOnly,
      },
    };

    const jsonContent = { test: 123, data: 'some data' };
    const payload = { title: 'this is a title', body: 'abc1234' };

    const fileMetadata: UploadFileMetadata = {
      allowDistribution: true,
      appData: {
        tags: [],
        fileType: 844,
        dataType: 111,
        contentIsComplete: false,
        jsonContent: JSON.stringify(jsonContent),
      },
      contentType: 'application/json',
      payloadIsEncrypted: true,
      accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
    };

    const payloadBytes = stringToUint8Array(jsonStringify64(payload));
    const uploadResult = await uploadFile(
      dotYouClient,
      instructionSet,
      fileMetadata,
      payloadBytes,
      undefined,
      true
    );
    setStatusText(
      `${uploadResult.file.fileId} send to ${recipient} with status ${uploadResult.recipientStatus[recipient]}`
    );
  }

  function disconnectFromNotificationSocket() {
    if (!webSocketClient) {
      console.log('No Client');
      return;
    }

    console.log('Sending Disconnect');
    webSocketClient.close(1000, 'Normal Disconnect');
  }

  return (
    <>
      <PageMeta title={'UI Demo'} />

      <CollapsableSection title="Domain highlighter">
        <div>
          <DomainHighlighter>michael.seife|rt.com.id</DomainHighlighter>
        </div>
        <div>
          <DomainHighlighter>michael.seifert.com</DomainHighlighter>
        </div>
        <div>
          <DomainHighlighter>www.sourtfàrthing.us</DomainHighlighter>
        </div>
        <div>
          <DomainHighlighter>www.sourtfàrtàhing.uàs</DomainHighlighter>
        </div>
      </CollapsableSection>

      <CollapsableSection title="WebSockets Test">
        <div className="m-4">
          This demo uses the built-in chat drive drive. Be sure the sender has access on the
          recipient&apos;s identity
        </div>
        <div style={{ height: '300px' }}>
          {!isConnected && (
            <ActionButton onClick={establishNotificationSocket}>Connect</ActionButton>
          )}

          {isConnected && (
            <>
              <div className="mb-4 flex flex-row">
                <div>
                  <ActionButton className="mr-3" onClick={disconnectFromNotificationSocket}>
                    Disconnect
                  </ActionButton>
                </div>
                <div>
                  <ActionButton onClick={sendFile}>Send file to {recipient}</ActionButton>
                </div>
              </div>

              <hr />
              <div>Status</div>
              <div>{statusText}</div>
            </>
          )}
        </div>
      </CollapsableSection>
      <CollapsableSection title="Buttons" isOpenByDefault={false}>
        <div className="flex flex-row">
          <div className="w-1/2 p-10">
            <h2>Light Mode</h2>
            <h2 className="mt-10">Primary</h2>
            <div className="flex flex-row">
              <div className="col">
                <ActionButton className="mt-5" icon="save">
                  Save
                </ActionButton>
                <ActionButton className="mt-5" icon="save" state={'success'}>
                  Save
                </ActionButton>
                <ActionButton className="mt-5" icon="save" state={'loading'}>
                  Save
                </ActionButton>
                <ActionButton className="mt-5" icon="save" state={'error'}>
                  Save
                </ActionButton>
              </div>
              <div className="col ml-5">
                <ActionButton className="mt-5" icon="send">
                  Send
                </ActionButton>
                <ActionButton className="mt-5" icon="send" state={'success'}>
                  Send
                </ActionButton>
                <ActionButton className="mt-5" icon="send" state={'loading'}>
                  Send
                </ActionButton>
                <ActionButton className="mt-5" icon="send" state={'error'}>
                  Send
                </ActionButton>
              </div>
              <div className="col ml-5">
                <ActionButton className="mt-5">Do</ActionButton>
                <ActionButton className="mt-5" state={'success'}>
                  Do
                </ActionButton>
                <ActionButton className="mt-5" state={'loading'}>
                  Do
                </ActionButton>
                <ActionButton className="mt-5" state={'error'}>
                  Do
                </ActionButton>
              </div>
            </div>

            <h2 className="mt-10">Secondary</h2>
            <div className="flex flex-row">
              <div className="col">
                <ActionButton type="secondary" className="mt-5" icon="save">
                  Save
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" icon="save" state={'success'}>
                  Save
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" icon="save" state={'loading'}>
                  Save
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" icon="save" state={'error'}>
                  Save
                </ActionButton>
              </div>
              <div className="col ml-5">
                <ActionButton type="secondary" className="mt-5" icon="send">
                  Send
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" icon="send" state={'success'}>
                  Send
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" icon="send" state={'loading'}>
                  Send
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" icon="send" state={'error'}>
                  Send
                </ActionButton>
              </div>
              <div className="col ml-5">
                <ActionButton type="secondary" className="mt-5">
                  Do
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" state={'success'}>
                  Do
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" state={'loading'}>
                  Do
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" state={'error'}>
                  Do
                </ActionButton>
              </div>
            </div>

            <h2 className="mt-10">Remove</h2>
            <div className="flex flex-row">
              <div className="col">
                <ActionButton type="remove" className="mt-5" icon="save">
                  Save
                </ActionButton>
                <ActionButton type="remove" className="mt-5" icon="save" state={'success'}>
                  Save
                </ActionButton>
                <ActionButton type="remove" className="mt-5" icon="save" state={'loading'}>
                  Save
                </ActionButton>
                <ActionButton type="remove" className="mt-5" icon="save" state={'error'}>
                  Save
                </ActionButton>
              </div>
              <div className="col ml-5">
                <ActionButton type="remove" className="mt-5" icon="send">
                  Send
                </ActionButton>
                <ActionButton type="remove" className="mt-5" icon="send" state={'success'}>
                  Send
                </ActionButton>
                <ActionButton type="remove" className="mt-5" icon="send" state={'loading'}>
                  Send
                </ActionButton>
                <ActionButton type="remove" className="mt-5" icon="send" state={'error'}>
                  Send
                </ActionButton>
              </div>
              <div className="col ml-5">
                <ActionButton type="remove" className="mt-5">
                  Do
                </ActionButton>
                <ActionButton type="remove" className="mt-5" state={'success'}>
                  Do
                </ActionButton>
                <ActionButton type="remove" className="mt-5" state={'loading'}>
                  Do
                </ActionButton>
                <ActionButton type="remove" className="mt-5" state={'error'}>
                  Do
                </ActionButton>
              </div>
            </div>
          </div>
          <div className="dark w-1/2 bg-gray-900 p-10">
            <h2 className="text-white">Dark Mode</h2>
            <h2 className="mt-10 text-white">Primary</h2>
            <div className="flex flex-row">
              <div className="col">
                <ActionButton className="mt-5" icon="save">
                  Save
                </ActionButton>
                <ActionButton className="mt-5" icon="save" state={'success'}>
                  Save
                </ActionButton>
                <ActionButton className="mt-5" icon="save" state={'loading'}>
                  Save
                </ActionButton>
                <ActionButton className="mt-5" icon="save" state={'error'}>
                  Save
                </ActionButton>
              </div>
              <div className="col ml-5">
                <ActionButton className="mt-5" icon="send">
                  Send
                </ActionButton>
                <ActionButton className="mt-5" icon="send" state={'success'}>
                  Send
                </ActionButton>
                <ActionButton className="mt-5" icon="send" state={'loading'}>
                  Send
                </ActionButton>
                <ActionButton className="mt-5" icon="send" state={'error'}>
                  Send
                </ActionButton>
              </div>
              <div className="col ml-5">
                <ActionButton className="mt-5">Do</ActionButton>
                <ActionButton className="mt-5" state={'success'}>
                  Do
                </ActionButton>
                <ActionButton className="mt-5" state={'loading'}>
                  Do
                </ActionButton>
                <ActionButton className="mt-5" state={'error'}>
                  Do
                </ActionButton>
              </div>
            </div>

            <h2 className="mt-10 text-white">Secondary</h2>
            <div className="flex flex-row">
              <div className="col">
                <ActionButton type="secondary" className="mt-5" icon="save">
                  Save
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" icon="save" state={'success'}>
                  Save
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" icon="save" state={'loading'}>
                  Save
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" icon="save" state={'error'}>
                  Save
                </ActionButton>
              </div>
              <div className="col ml-5">
                <ActionButton type="secondary" className="mt-5" icon="send">
                  Send
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" icon="send" state={'success'}>
                  Send
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" icon="send" state={'loading'}>
                  Send
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" icon="send" state={'error'}>
                  Send
                </ActionButton>
              </div>
              <div className="col ml-5">
                <ActionButton type="secondary" className="mt-5">
                  Do
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" state={'success'}>
                  Do
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" state={'loading'}>
                  Do
                </ActionButton>
                <ActionButton type="secondary" className="mt-5" state={'error'}>
                  Do
                </ActionButton>
              </div>
            </div>

            <h2 className="mt-10 text-white">Remove</h2>
            <div className="flex flex-row">
              <div className="col">
                <ActionButton type="remove" className="mt-5" icon="save">
                  Save
                </ActionButton>
                <ActionButton type="remove" className="mt-5" icon="save" state={'success'}>
                  Save
                </ActionButton>
                <ActionButton type="remove" className="mt-5" icon="save" state={'loading'}>
                  Save
                </ActionButton>
                <ActionButton type="remove" className="mt-5" icon="save" state={'error'}>
                  Save
                </ActionButton>
              </div>
              <div className="col ml-5">
                <ActionButton type="remove" className="mt-5" icon="send">
                  Send
                </ActionButton>
                <ActionButton type="remove" className="mt-5" icon="send" state={'success'}>
                  Send
                </ActionButton>
                <ActionButton type="remove" className="mt-5" icon="send" state={'loading'}>
                  Send
                </ActionButton>
                <ActionButton type="remove" className="mt-5" icon="send" state={'error'}>
                  Send
                </ActionButton>
              </div>
              <div className="col ml-5">
                <ActionButton type="remove" className="mt-5">
                  Do
                </ActionButton>
                <ActionButton type="remove" className="mt-5" state={'success'}>
                  Do
                </ActionButton>
                <ActionButton type="remove" className="mt-5" state={'loading'}>
                  Do
                </ActionButton>
                <ActionButton type="remove" className="mt-5" state={'error'}>
                  Do
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      </CollapsableSection>
    </>
  );
};
export default UiDemo;
