import { ActionGroup, ActionLink, CHAT_ROOT_PATH, t } from '@homebase-id/common-app';
import { ChevronDown, Plus } from '@homebase-id/common-app/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const NavHeader = ({ isOnline }: { isOnline: boolean }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isArchived = searchParams.get('type') === 'archived';

  return (
    <div className="flex flex-row items-center gap-2 p-2 lg:p-5 lg:pb-2">
      <ActionGroup
        options={[
          isArchived
            ? { label: 'All', onClick: () => navigate(`${CHAT_ROOT_PATH}`) }
            : { label: 'Archived', onClick: () => navigate(`${CHAT_ROOT_PATH}?type=archived`) },
        ]}
        className=""
        type="mute"
        size="none"
      >
        <div className="flex flex-row items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full transition-colors ${
              isOnline ? 'bg-green-400' : 'bg-red-400'
            }`}
            title={isOnline ? t('Connected') : t('Offline')}
          />

          <p className="text-2xl dark:text-white">{isArchived ? t('Archived') : 'Homebase Chat'}</p>
          <ChevronDown className="h-4 w-4" />
        </div>
      </ActionGroup>
      <div className="ml-auto flex flex-row items-center gap-2">
        <ActionLink href={`${CHAT_ROOT_PATH}/new`} icon={Plus} type="secondary">
          {t('New')}
        </ActionLink>
      </div>
    </div>
  );
};
