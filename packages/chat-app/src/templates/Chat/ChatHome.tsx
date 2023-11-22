import { OwnerName, useDotYouClient, useSiteData } from '@youfoundation/common-app';
import { OdinImage } from '@youfoundation/ui-lib';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
import { useChatTransitProcessor } from '../../hooks/chat/useChatTransitProcessor';
import { useChatCommandProcessor } from '../../hooks/chat/useChatCommandProcessor';
import { useNavigate, useParams } from 'react-router-dom';
import { ConversationsList } from './Conversations';
import { ChatDetail } from './ChatDetail';

const ConversationsOverview = () => {
  useChatTransitProcessor(true);
  useChatCommandProcessor();

  const { conversationKey } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full flex-row overflow-hidden">
      <div className="h-screen w-full max-w-xs flex-shrink-0 border-r bg-page-background dark:border-r-slate-800">
        <ProfileHeader />
        <ConversationsList
          activeConversationId={conversationKey}
          openConversation={(newId) => navigate(`/${newId}`)}
        />
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
    </div>
  );
};

export default ConversationsOverview;
