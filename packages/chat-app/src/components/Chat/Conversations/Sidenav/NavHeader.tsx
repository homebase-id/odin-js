import { ActionLink, CHAT_ROOT_PATH, t } from '@homebase-id/common-app';
import { Plus } from '@homebase-id/common-app/icons';

export const NavHeader = ({ isOnline }: { isOnline: boolean }) => {
  return (
    <div className="flex flex-row items-center gap-2 p-2 lg:p-5 lg:pb-2">
      <div className="flex flex-row items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full transition-colors ${
            isOnline ? 'bg-green-400' : 'bg-red-400'
          }`}
          title={isOnline ? t('Connected') : t('Offline')}
        />

        <p className="text-2xl dark:text-white">Homebase Chat</p>
      </div>
      <div className="ml-auto flex flex-row items-center gap-2">
        <ActionLink href={`${CHAT_ROOT_PATH}/new`} icon={Plus} type="secondary">
          {t('New')}
        </ActionLink>
      </div>
    </div>
  );
};
