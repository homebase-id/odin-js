import {
  ActionButton,
  ConnectionImage,
  ConnectionName,
  EmojiSelector,
  FileSelector,
  ImageIcon,
  Input,
  OwnerName,
  VolatileInput,
  t,
  useDotYouClient,
  useSiteData,
} from '@youfoundation/common-app';
import { useConversations } from '../../hooks/chat/useConversations';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { Conversation } from '../../providers/ConversationProvider';
import { useEffect, useState } from 'react';
import { OdinImage } from '@youfoundation/ui-lib';
import { HomePageConfig } from '@youfoundation/js-lib/public';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';

const ConversationsOverview = () => {
  return (
    <div className="flex h-screen w-full flex-row overflow-hidden">
      <div className="h-screen w-full max-w-xs flex-shrink-0 border-r bg-page-background p-5 ">
        <ProfileHeader />
        <ConversationsList />
      </div>
      <div className="h-screen w-full flex-grow bg-background">
        <Chat />
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
    <div className="flex flex-row items-center gap-2 pb-5">
      <OdinImage
        dotYouClient={dotYouClient}
        targetDrive={GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId)}
        fileId={data?.owner.profileImageFileId}
        fileKey={data?.owner.profileImageFileKey}
        lastModified={data?.owner.profileImageLastModified}
        previewThumbnail={data?.owner.profileImagePreviewThumbnail}
        className="aspect-square max-h-[2.5rem] w-full max-w-[2.5rem] rounded-full border border-neutral-200"
        fit="cover"
        odinId={odinId}
      />
      <OwnerName />
    </div>
  );
};

const ConversationsList = () => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const { data: conversations } = useConversations().all;

  const flatConversaions =
    (conversations?.pages
      ?.flatMap((page) => page.searchResults)
      ?.filter(Boolean) as DriveSearchResult<Conversation>[]) || [];

  return (
    <div className="flex flex-grow flex-col ">
      <SearchConversation setIsSearchActive={setIsSearchActive} />
      <div className="flex-grow overflow-auto">
        {flatConversaions?.map((conversation) => (
          <ConversationItem key={conversation.fileId} conversation={conversation} />
        ))}
      </div>
    </div>
  );
};

const ConversationItem = ({ conversation }: { conversation: DriveSearchResult<Conversation> }) => {
  return <>{conversation.fileMetadata.appData.content.conversationId}</>;
};

const SearchConversation = ({
  setIsSearchActive,
}: {
  setIsSearchActive: (isActive: boolean) => void;
}) => {
  const [query, setQuery] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (query && query.length > 1) setIsSearchActive(true);
    else setIsSearchActive(false);
  }, [query]);

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="flex flex-row gap-1">
        <Input onChange={(e) => setQuery(e.target.value)} />
        <ActionButton type="secondary">{t('Search')}</ActionButton>
      </div>
    </form>
  );
};

const Chat = ({ conversationId }: { conversationId: string }) => {
  return (
    <div className="flex h-full flex-grow flex-col">
      <ChatHeader />
      <ChatHistory />
      <ChatComposer />
    </div>
  );
};

const ChatHeader = () => {
  return (
    <div className="flex flex-row items-center gap-2 bg-page-background p-5 ">
      <ConnectionImage odinId="sam.dotyou.cloud" className="border border-neutral-200" size="sm" />
      <ConnectionName odinId="sam.dotyou.cloud" />
    </div>
  );
};

const ChatHistory = () => {
  return <div className="h-full flex-grow"></div>;
};

const ChatComposer = () => {
  return (
    <div className="flex flex-shrink-0 flex-row gap-2 bg-page-background px-5 py-3">
      <div className="my-auto flex flex-row items-center gap-1">
        <EmojiSelector
          size="none"
          className="px-1 py-1 text-foreground text-opacity-30 hover:text-opacity-100"
          onInput={(val) => console.log(val)}
        />
        <FileSelector
          // onChange={(newFiles) => setAttachment(newFiles?.[0])}
          className="text-foreground text-opacity-30 hover:text-opacity-100"
        >
          <ImageIcon className="h-5 w-5" />
        </FileSelector>
      </div>
      <VolatileInput placeholder="Your message" className="rounded-md border bg-background p-2" />
      <ActionButton type="secondary">{t('Send')}</ActionButton>
    </div>
  );
};

export default ConversationsOverview;
