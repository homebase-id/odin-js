import { createPortal } from 'react-dom';
import {
  Alert,
  Arrow,
  Bubble,
  Check,
  ErrorNotification,
  HardDrive,
  PaperPlane,
  SubtleCheck,
  SubtleMessage,
  Times,
  Trash,
  t,
} from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';
import {
  usePushNotificationClient,
  usePushNotificationClients,
  usePushNotifications,
} from '../../../hooks/notifications/usePushNotifications';
import { PushNotificationSubscription } from '../../../provider/notifications/PushClientProvider';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const PushNotificationsDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const target = usePortal('modal-container');
  const [isDetails, setIsDetails] = useState(false);

  const { data: current } = usePushNotificationClients().fetchCurrent;
  const { isSupported, isEnabled } = usePushNotificationClient();

  if (!isOpen) return null;
  const dialog = (
    <DialogWrapper
      title={
        <>
          {t('Notification Settings')}
          {isSupported && isEnabled && current ? (
            <small className="mt-1 flex flex-row items-center gap-1 text-sm">
              <SubtleCheck className="h-5 w-5" /> {t('Notifications are enabled on this device')}
            </small>
          ) : null}
        </>
      }
      onClose={onClose}
    >
      <Settings />

      <button
        onClick={() => setIsDetails(!isDetails)}
        className={`mt-5 flex flex-row items-center ${isDetails ? 'font-bold' : 'text-sm italic'}`}
      >
        {t('All devices')}{' '}
        <Arrow className={`ml-2 h-4 w-4 transition-transform ${isDetails ? 'rotate-90' : ''}`} />
      </button>
      {isDetails ? <AllDevicesDetail className="mt-5" /> : null}
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

const Settings = () => {
  const { data: current } = usePushNotificationClients().fetchCurrent;
  const { isSupported, canEnable, isEnabled } = usePushNotificationClient();

  const {
    mutate: enable,
    status: enableStatus,
    error: enableError,
  } = usePushNotificationClient().enableOnThisDevice;

  const {
    mutate: sendTestNotification,
    status: testNotificationStatus,
    error: testNotificationError,
  } = usePushNotificationClient().sendTestNotification;

  // const {
  //   mutate: removeCurrent,
  //   status: removeStatus,
  //   error: removeError,
  // } = usePushNotificationClients().removeCurrent;

  return (
    <>
      <ErrorNotification error={testNotificationError || enableError} />

      {!isSupported ? (
        <Alert type="warning">
          {t('Notifications are not supported on this browser')}{' '}
          <Link className="text-primary hover:underline" to={`/owner/notifications/problems`}>
            {t(`What does this mean?`)}
          </Link>
        </Alert>
      ) : null}

      {isSupported && !canEnable && !(isEnabled || current) ? (
        <p>{t(`We can't enable notifications at the moment, please refresh and try again`)}</p>
      ) : null}

      {isSupported ? (
        <>
          {(isEnabled && current) || enableStatus === 'success' ? (
            <>
              <SubtleMessage>
                {t(
                  'You can confirm that notifications are working as expeced, by triggering a test notification:'
                )}
              </SubtleMessage>

              <ActionButton
                icon={PaperPlane}
                onClick={() => sendTestNotification()}
                state={testNotificationStatus}
              >
                {t('Send a test notification')}
              </ActionButton>
              {testNotificationStatus === 'success' ? (
                <p className="my-2">
                  {t(`Notification sent. Didn't get it?`)}{' '}
                  <Link
                    className="text-primary hover:underline"
                    to={`/owner/notifications/problems`}
                  >
                    {t(`What can I do?`)}
                  </Link>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <SubtleMessage>
                {t(
                  `When push notifications are enabled, you will get notifications as they come in, even if you don't have your identity open`
                )}
                .
              </SubtleMessage>
              <ActionButton onClick={() => enable()} icon={Bubble} state={enableStatus}>
                {t('Enable push notifications')}
              </ActionButton>
            </>
          )}
        </>
      ) : null}
    </>
  );
};

const AllDevicesDetail = ({ className }: { className?: string }) => {
  const { data: devices } = usePushNotificationClients().fetch;
  const {
    removeAll: {
      mutate: removeAllDevices,
      status: removeAllDevicesStatus,
      error: removeAllDevicesError,
    },
  } = usePushNotificationClients();

  return (
    <div className={className}>
      <ErrorNotification error={removeAllDevicesError} />
      <p className="mb-5 text-xl">
        {t('Registered devices:')}
        <small className="block text-sm text-foreground/80">
          {t('All of these devices will show notification when they come in')}
        </small>
      </p>
      {!devices?.length ? (
        <SubtleMessage>{t('No devices registered')}</SubtleMessage>
      ) : (
        <>
          <div className="grid grid-flow-row gap-4">
            {devices?.map((device) => (
              <DeviceView subscription={device} key={device.accessRegistrationId} />
            ))}
          </div>

          <div className="flex flex-row-reverse">
            <ActionButton
              type="remove"
              icon={Trash}
              onClick={() => removeAllDevices()}
              state={removeAllDevicesStatus}
            >
              {t('Remove all')}
            </ActionButton>
          </div>
        </>
      )}
    </div>
  );
};

const DeviceView = ({
  subscription,
  className,
}: {
  subscription: PushNotificationSubscription;
  className?: string;
}) => {
  const {
    fetchCurrent: { data: currentDevice },
    removeCurrent: {
      mutate: removeCurrentDevice,
      status: removeCurrentDeviceStatus,
      error: removeCurrentDeviceError,
    },
  } = usePushNotificationClients();

  return (
    <>
      <ErrorNotification error={removeCurrentDeviceError} />
      <div className={`flex flex-row items-center ${className ?? ''}`}>
        <HardDrive className="mb-auto mr-3 mt-1 h-6 w-6" />
        <div className="mr-2 flex flex-col">
          {subscription.friendlyName}
          <small className="block text-sm">
            {t('Since')}: {new Date(subscription.subscriptionStartedDate).toLocaleDateString()}
          </small>
        </div>
        {currentDevice?.accessRegistrationId === subscription.accessRegistrationId ? (
          <ActionButton
            icon={Times}
            type="secondary"
            size="square"
            className="ml-2"
            onClick={async () => {
              removeCurrentDevice();
            }}
            state={removeCurrentDeviceStatus}
          />
        ) : null}
      </div>
    </>
  );
};

export default PushNotificationsDialog;
