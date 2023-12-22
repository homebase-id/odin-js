import { createPortal } from 'react-dom';
import {
  Check,
  ErrorNotification,
  HardDrive,
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
} from '../../../hooks/notifications/usePushNotifications';
import { PushNotificationSubscription } from '../../../provider/notifications/PushClientProvider';

const PushNotificationsDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const target = usePortal('modal-container');
  const { data: devices } = usePushNotificationClients().fetch;
  const {
    removeAll: {
      mutate: removeAllDevices,
      status: removeAllDevicesStatus,
      error: removeAllDevicesError,
    },
  } = usePushNotificationClients();
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
      <ErrorNotification error={removeAllDevicesError} />
      <p className="mb-5 text-xl">
        {t('Registered devices:')}
        <small className="block text-sm text-foreground/80">
          {t('These devices will device specfici notification when they come in')}
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
    </DialogWrapper>
  );

  return createPortal(dialog, target);
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
