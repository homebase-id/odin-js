import {
  ActionGroup,
  ActionLink,
  ChevronDown,
  Plus,
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

export const RUNNING_AS_APP =
  !window.location.pathname.startsWith('/owner') ||
  window.location.pathname.startsWith('/apps/chat');

export const CHAT_ROOT = ROOT_PATH;

export const ChatHome = () => {
  useChatTransitProcessor(true);
  useChatCommandProcessor();

  const { conversationKey } = useParams();
  const navigate = useNavigate();

  const newChatMatch = useMatch({ path: `${CHAT_ROOT}/new` });
  const isCreateNew = !!newChatMatch;

  const newGroupChatMatch = useMatch({ path: `${CHAT_ROOT}/new-group` });
  const isCreateNewGroup = !!newGroupChatMatch;

  const rootChatMatch = useMatch({ path: CHAT_ROOT });
  const isRoot = !!rootChatMatch;

  return (
    <div className="flex h-screen w-full flex-row overflow-hidden">
      {RUNNING_AS_APP || isRoot ? (
        <div
          className={`flex h-screen w-full ${
            RUNNING_AS_APP ? 'max-w-sm' : ''
          } flex-shrink-0 flex-col border-r bg-page-background dark:border-r-slate-800`}
        >
          {isCreateNew ? (
            <NewConversation />
          ) : isCreateNewGroup ? (
            <NewConversationGroup />
          ) : (
            <>
              <ProfileHeader />
              <ConversationsList
                activeConversationId={conversationKey}
                openConversation={(newId) => navigate(`${CHAT_ROOT}/${newId}`)}
              />
            </>
          )}
        </div>
      ) : null}
      <div className="h-screen w-full flex-grow bg-background">
        <ChatDetail conversationId={conversationKey} />
      </div>
    </div>
  );
};

const ProfileHeader = () => {
  const { data } = useSiteData();
  const { getIdentity, getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const odinId = getIdentity() || undefined;

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
          },
          {
            label: 'Logout',
            onClick: () => {
              logout();
            },
          },
        ]}
      >
        <ChevronDown className="h-4 w-4" />
      </ActionGroup>
      <div className="ml-auto">
        <ActionLink href={`${CHAT_ROOT}/new`} icon={Plus} type="mute" />
      </div>
    </div>
  );
};
