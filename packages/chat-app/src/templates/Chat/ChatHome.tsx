import {
  ActionLink,
  OwnerName,
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

const ConversationsOverview = () => {
  useChatTransitProcessor(true);
  useChatCommandProcessor();

  const { conversationKey } = useParams();
  const navigate = useNavigate();

  const newChatMatch = useMatch({ path: '/new' });
  const isCreateNew = !!newChatMatch;

  const newGroupChatMatch = useMatch({ path: '/new-group' });
  const isCreateNewGroup = !!newGroupChatMatch;

  return (
    <div className="flex h-screen w-full flex-row overflow-hidden">
      <div className="flex h-screen w-full max-w-xs flex-shrink-0 flex-col border-r bg-page-background dark:border-r-slate-800">
        {isCreateNew ? (
          <NewConversation />
        ) : isCreateNewGroup ? (
          <NewConversationGroup />
        ) : (
          <>
            <ProfileHeader />
            <ConversationsList
              activeConversationId={conversationKey}
              openConversation={(newId) => navigate(`/${newId}`)}
            />
          </>
        )}
      </div>
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
      <OwnerName />
      <div className="ml-auto">
        <ActionLink href="/new" icon={Plus} type="mute" />
      </div>
    </div>
  );
};

export default ConversationsOverview;
