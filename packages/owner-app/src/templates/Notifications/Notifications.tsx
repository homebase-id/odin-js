import { ActionButton, SubtleMessage, t, Toast } from '@youfoundation/common-app';
import { Bell } from '@youfoundation/common-app';
import { useNotifications } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';

const Notifications = () => {
  const { notifications: notificationList } = useNotifications();

  return (
    <>
      <PageMeta
        title={t('Notifications')}
        icon={Bell}
        actions={
          Notification.permission === 'granted' ? null : (
            <ActionButton onClick={async () => await Notification.requestPermission()}>
              {t('Enable push notifications')}
            </ActionButton>
          )
        }
      />
      {notificationList?.length ? (
        <div className="flex flex-col gap-3 px-2">
          {notificationList.map((notification, index) => (
            <Toast {...notification} key={index} type={undefined} />
          ))}
        </div>
      ) : (
        <SubtleMessage>{t('No notifications')}</SubtleMessage>
      )}
    </>
  );
};

export default Notifications;
