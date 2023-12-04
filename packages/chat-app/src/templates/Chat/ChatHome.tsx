import {
  ActionButton,
  ActionGroup,
  ActionLink,
  ChevronDown,
  House,
  Moon,
  Person,
  Plus,
  Sun,
  Times,
  t,
  useDarkMode,
  useDotYouClient,
  useSiteData,
} from '@youfoundation/common-app';
import { OdinImage } from '@youfoundation/ui-lib';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
import { useChatTransitProcessor } from '../../hooks/chat/useChatTransitProcessor';
import { useChatCommandProcessor } from '../../hooks/chat/useChatCommandProcessor';
import { useNavigate, useParams, useMatch } from 'react-router-dom';
import { ConversationsList } from './Conversations';
import { ChatDetail } from './ChatDetail';
import { NewConversation } from './NewConversation';
import { NewConversationGroup } from './NewConversationGroup';
import { ROOT_PATH } from '../../app/App';
import { useAuth } from '../../hooks/auth/useAuth';
import { useState } from 'react';

export const CHAT_ROOT = ROOT_PATH;

export const ChatHome = () => {
  const { conversationKey } = useParams();

  const [isSidenavOpen, setIsSidenavOpen] = useState(false);

  useChatTransitProcessor(true);
  useChatCommandProcessor();

  return (
    <div className="flex h-screen w-full flex-row overflow-hidden">
      <Aside isOpen={isSidenavOpen} setIsSidenavOpen={setIsSidenavOpen} />

      <div className="h-screen w-full flex-grow bg-background">
        <ChatDetail
          conversationId={conversationKey}
          toggleSidenav={() => setIsSidenavOpen(!isSidenavOpen)}
        />
      </div>
    </div>
  );
};

const Aside = ({
  isOpen,
  setIsSidenavOpen,
}: {
  isOpen: boolean;
  setIsSidenavOpen: (newIsOpen: boolean) => void;
}) => {
  const { conversationKey } = useParams();

  const navigate = useNavigate();

  const newChatMatch = useMatch({ path: `${CHAT_ROOT}/new` });
  const isCreateNew = !!newChatMatch;

  const newGroupChatMatch = useMatch({ path: `${CHAT_ROOT}/new-group` });
  const isCreateNewGroup = !!newGroupChatMatch;

  const rootChatMatch = useMatch({ path: CHAT_ROOT });
  const isRoot = !!rootChatMatch;

  const isActive = isOpen || isCreateNew || isCreateNewGroup || isRoot;

  return (
    <div
      className={`${
        isActive ? 'translate-x-full' : 'translate-x-0'
      } fixed bottom-0 left-[-100%] top-0 z-10 flex h-screen w-full flex-shrink-0 flex-col border-r bg-page-background transition-transform dark:border-r-slate-800 lg:static lg:max-w-sm lg:translate-x-0`}
    >
      {isCreateNew ? (
        <NewConversation />
      ) : isCreateNewGroup ? (
        <NewConversationGroup />
      ) : (
        <>
          <ProfileHeader closeSideNav={isRoot ? undefined : () => setIsSidenavOpen(false)} />
          <ConversationsList
            activeConversationId={conversationKey}
            openConversation={(newId) => {
              setIsSidenavOpen(false);
              navigate(`${CHAT_ROOT}/${newId}`);
            }}
          />
        </>
      )}
    </div>
  );
};

const ProfileHeader = ({ closeSideNav }: { closeSideNav: (() => void) | undefined }) => {
  const { data } = useSiteData();
  const { getIdentity, getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const odinId = getIdentity() || undefined;
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const { logout } = useAuth();

  return (
    <div className="flex flex-row items-center gap-2 p-5">
      <OdinImage
        dotYouClient={dotYouClient}
        targetDrive={GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId)}
        fileId={data?.owner.profileImageFileId}
        fileKey={data?.owner.profileImageFileKey}
        lastModified={data?.owner.profileImageLastModified}
        previewThumbnail={data?.owner.profileImagePreviewThumbnail}
        className="aspect-square max-h-[2.5rem] w-full max-w-[2.5rem] rounded-full border border-neutral-200 dark:border-neutral-800"
        fit="cover"
        odinId={odinId}
      />
      <ActionGroup
        type="mute"
        options={[
          {
            label: 'Open your owner profile',
            href: '/owner',
            icon: House,
          },
          {
            label: 'Logout',
            onClick: () => logout(),
            icon: Person,
          },
          isDarkMode
            ? {
                label: 'Light mode',
                icon: Sun,
                onClick: toggleDarkMode,
              }
            : {
                label: 'Dark mode',
                icon: Moon,
                onClick: () => toggleDarkMode(),
              },
        ]}
      >
        <ChevronDown className="h-4 w-4" />
      </ActionGroup>
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
