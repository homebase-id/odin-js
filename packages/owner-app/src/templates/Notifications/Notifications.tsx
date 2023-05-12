import { t, Toast } from '@youfoundation/common-app';
import PageMeta from '../../components/ui/Layout/PageMeta/PageMeta';
import { Bell } from '@youfoundation/common-app';
import { useNotifications } from '@youfoundation/common-app';

const Notifications = () => {
  const { notifications: notificationList } = useNotifications();

  return (
    <>
      <PageMeta title={t('Notifications')} icon={Bell} />
      {notificationList?.length ? (
        <div className="flex flex-col gap-3 px-2">
          {notificationList.map((notification, index) => (
            <Toast {...notification} key={index} type={undefined} />
          ))}
        </div>
      ) : (
        <p className="italic text-slate-400">{t('No notifications')}</p>
      )}
    </>
  );
};

export default Notifications;
