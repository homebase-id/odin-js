import { ActionButton, ActionLink, Plus, Times, t } from '@youfoundation/common-app';
import { CHAT_ROOT } from '../../../../templates/Chat/ChatHome';

export const NavHeader = ({
  closeSideNav,
  isOnline,
}: {
  closeSideNav: (() => void) | undefined;
  isOnline: boolean;
}) => {
  return (
    <div className="flex flex-row items-center gap-2 p-2 lg:p-5">
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
        <ActionLink href={`${CHAT_ROOT}/new`} icon={Plus} type="secondary">
          {t('New')}
        </ActionLink>
        {closeSideNav ? (
          <ActionButton className="lg:hidden" type="mute" onClick={closeSideNav}>
            <Times className="h-5 w-5" />
          </ActionButton>
        ) : null}
      </div>
    </div>
  );
};