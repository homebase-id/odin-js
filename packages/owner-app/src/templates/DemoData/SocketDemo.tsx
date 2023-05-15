import ActionButton from '../../components/ui/Buttons/ActionButton';
import { PageMeta } from '@youfoundation/common-app';
import {
  ApiType,
  Disconnect,
  DotYouClient,
  Notify,
  getRandom16ByteArray,
  ScheduleOptions,
  SecurityGroupType,
  SendContents,
  Subscribe,
  TargetDrive,
  uploadFile,
  UploadFileMetadata,
  UploadInstructionSet,
  stringToUint8Array,
  jsonStringify64,
  TypedConnectionNotification,
} from '@youfoundation/js-lib';
import { useRef, useState } from 'react';
import useAuth from '../../hooks/auth/useAuth';
import Section from '../../components/ui/Sections/Section';

const sender = window.location.hostname;
const recipient = sender === 'frodo.digital' ? 'samwise.digital' : 'frodo.digital';

const chatDrive: TargetDrive = {
  alias: '9ff813aff2d61e2f9b9db189e72d1a11',
  type: '66ea8355ae4155c39b5a719166b510e3',
};

const SocketDemo = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [statusText, setStatusText] = useState('n/a');
  const dotYouClient = useAuth().getDotYouClient();

  const notificationHandler = useRef((notification: TypedConnectionNotification) => {
    console.log({ notification });

    if (notification.notificationType === 'transitFileReceived') {
      console.log(
        'Replying to TransitFileReceived by sending processTransitInstructions for the targetDrive'
      );

      Notify({
        command: 'processTransitInstructions',
        data: JSON.stringify(notification.externalFileIdentifier),
      });
    }

    setStatusText(
      `Notification Type received: ${notification.notificationType}. See console for more`
    );
  });

  const establishNotificationSocket = async () => {
    await Subscribe(dotYouClient, [chatDrive], notificationHandler.current);

    setIsConnected(true);
  };

  const sendFile = async () => {
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
  };

  const disconnectFromNotificationSocket = () => {
    Disconnect(notificationHandler.current);
    setIsConnected(false);
  };

  return (
    <>
      <PageMeta title={'Socket Demo'} />

      <Section title="WebSockets Test">
        <div className="my-4">
          This demo uses the built-in chat drive drive. Be sure the sender has access on the
          recipient&apos;s identity
        </div>
        <div>
          <div className="my-4">
            {isConnected ? (
              <ActionButton onClick={disconnectFromNotificationSocket} type="remove">
                Disconnect
              </ActionButton>
            ) : (
              <ActionButton onClick={establishNotificationSocket}>Connect</ActionButton>
            )}
          </div>

          {isConnected ? (
            <>
              <hr />
              <div className="my-4 flex flex-row">
                <ActionButton onClick={sendFile}>Send file to {recipient}</ActionButton>
              </div>
              <div>{statusText}</div>
            </>
          ) : null}
        </div>
      </Section>
    </>
  );
};
export default SocketDemo;
