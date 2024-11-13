import { createPortal } from 'react-dom';
import {
  Alert,
  ErrorNotification,
  SubtleMessage,
  usePortal,
  t,
  ActionButton,
  DialogWrapper,
} from '@homebase-id/common-app';
import {
  Arrow,
  Bubble,
  HardDrive,
  PaperPlane,
  SubtleCheck,
  Times,
  Trash,
} from '@homebase-id/common-app/icons';
import { PushNotificationSubscription } from '../../../provider/notifications/PushClientProvider';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  usePushNotificationClient,
  usePushNotificationClients,
} from '../../../hooks/notifications/usePushNotificationClients';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';

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
        <Arrow className={`ml-2 h-5 w-5 transition-transform ${isDetails ? 'rotate-90' : ''}`} />
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
    reset: resetEnable,
  } = usePushNotificationClient().enableOnThisDevice;
  useEffect(() => {
    resetEnable();
  }, [current]);

  return (
    <>
      <ErrorNotification error={enableError} />

      {!isSupported ? (
        <Alert type="warning">
          {t('Notifications are not supported on this browser')}{' '}
          <Link className="text-primary hover:underline" to={`/owner/notifications/problems`}>
            {t(`What does this mean?`)}
          </Link>
        </Alert>
      ) : null}

      {isSupported && !canEnable && !(isEnabled && current) ? (
        <p>{t(`We can't enable notifications at the moment, please refresh and try again`)}</p>
      ) : null}

      {isSupported ? (
        <>
          {(isEnabled && current) || enableStatus === 'success' ? (
            <></>
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

      {enableError ? (
        <p className="my-2">
          {t(`I can't get notifications working,`)}{' '}
          <Link className="text-primary hover:underline" to={`/owner/notifications/problems`}>
            {t(`what can I do?`)}
          </Link>
        </p>
      ) : null}
    </>
  );
};

const TestNotification = ({ className }: { className?: string }) => {
  const {
    mutate: sendTestNotification,
    status: testNotificationStatus,
    error: testNotificationError,
    data: testNotificationData,
  } = usePushNotificationClient().sendTestNotification;

  return (
    <div className={className}>
      <ErrorNotification error={testNotificationError} />
      <SubtleMessage>
        {t(
          'You can confirm that notifications are working as expeced, by triggering a test notification:'
        )}
      </SubtleMessage>

      <ActionButton
        icon={PaperPlane}
        onClick={() => sendTestNotification()}
        state={testNotificationStatus}
        type="secondary"
      >
        {t('Send a test notification')}
      </ActionButton>
      {testNotificationStatus === 'success' ? (
        <p className="my-2">
          {t(`Notification sent. Didn't get it?`)}{' '}
          <Link className="text-primary hover:underline" to={`/owner/notifications/problems`}>
            {t(`What can I do?`)}
          </Link>
          <span className="block text-sm text-gray-400">
            {t('Reference id:')} {testNotificationData?.headers?.['odin-correlation-id']}
          </span>
        </p>
      ) : null}

      {testNotificationError ? (
        <p className="my-2">
          {t(`I can't get notifications working,`)}{' '}
          <Link className="text-primary hover:underline" to={`/owner/notifications/problems`}>
            {t(`what can I do?`)}
          </Link>
        </p>
      ) : null}
    </div>
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

      <TestNotification className="mt-5" />
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
    removeRegisteredDevice: {
      mutate: removeRegisteredDevice,
      status: removeRegisteredDeviceStatus,
      error: removeRegisteredDeviceError,
    },
  } = usePushNotificationClients();

  const isCurrent = useMemo(
    () => stringGuidsEqual(currentDevice?.accessRegistrationId, subscription.accessRegistrationId),
    [currentDevice, subscription]
  );

  return (
    <>
      <ErrorNotification error={removeCurrentDeviceError || removeRegisteredDeviceError} />
      <div className={`flex flex-row items-center ${className ?? ''}`}>
        <HardDrive className="mb-auto mr-3 mt-1 h-6 w-6" />
        <div className="mr-2 flex flex-col">
          <div>
            {subscription.friendlyName}{' '}
            {isCurrent ? <span className="text-slate-400">({t('this device')})</span> : null}
          </div>
          <small className="block text-sm">
            {t('Since')}: {new Date(subscription.subscriptionStartedDate).toLocaleDateString()}
          </small>
        </div>
        {isCurrent ? (
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
        ) : (
          <ActionButton
            icon={Times}
            type="secondary"
            size="square"
            className="ml-2"
            onClick={async () => {
              removeRegisteredDevice(subscription.accessRegistrationId);
            }}
            state={removeRegisteredDeviceStatus}
          />
        )}
      </div>
    </>
  );
};

export default PushNotificationsDialog;
