import { useChatTransitProcessor } from '../../hooks/chat/useChatTransitProcessor';
import { useChatCommandProcessor } from '../../hooks/chat/useChatCommandProcessor';
import { useNavigate, useParams, useMatch } from 'react-router-dom';

import { ChatDetail } from './ChatDetail';

import { ROOT_PATH } from '../../app/App';
import { useState } from 'react';
import { NewConversation } from '../../components/Chat/Conversations/Sidenav/NewConversation';
import { NewConversationGroup } from '../../components/Chat/Conversations/Sidenav/NewConversationGroup';
import { ConversationsSidebar } from '../../components/Chat/Conversations/Sidenav/ConversationsSidenav';
import { ProfileHeader } from '../../components/Chat/Conversations/Sidenav/ProfileHeader';

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
          <ConversationsSidebar
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
