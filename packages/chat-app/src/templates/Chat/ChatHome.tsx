import { useLiveChatProcessor } from '../../hooks/chat/useLiveChatProcessor';
import { useNavigate, useParams, useMatch } from 'react-router-dom';

import { ChatDetail } from './ChatDetail';

import { ROOT_PATH } from '../../app/App';
import { useState } from 'react';
import { NewConversation } from '../../components/Chat/Conversations/Sidenav/NewConversation';
import { NewConversationGroup } from '../../components/Chat/Conversations/Sidenav/NewConversationGroup';
import { ConversationsSidebar } from '../../components/Chat/Conversations/Sidenav/ConversationsSidenav';
import { NavHeader } from '../../components/Chat/Conversations/Sidenav/NavHeader';
import {
  CHAT_APP_ID,
  ExtendPermissionDialog,
  Sidenav,
  t,
  useRemoveNotifications,
} from '@youfoundation/common-app';
import { drives, permissions, useAuth } from '../../hooks/auth/useAuth';
import { Helmet } from 'react-helmet-async';

export const CHAT_ROOT = ROOT_PATH;

export const ChatHome = () => {
  const { conversationKey } = useParams();
  const [isSidenavOpen, setIsSidenavOpen] = useState(false);

  const isOnline = useLiveChatProcessor();
  useRemoveNotifications({ appId: CHAT_APP_ID });

  return (
    <>
      <Helmet>
        <title>Homebase | Chat</title>
      </Helmet>

      <ExtendPermissionDialog
        appName={t('Homebase Chat')}
        appId={CHAT_APP_ID}
        drives={drives}
        permissions={permissions}
        // needsAllConnected={true}
      />
      <div className={`flex h-[100dvh] w-full flex-row overflow-hidden`}>
        <ChatSideNav
          isOpen={isSidenavOpen}
          setIsSidenavOpen={setIsSidenavOpen}
          isOnline={isOnline}
        />

        <div className="h-full w-full flex-grow bg-background">
          <ChatDetail
            conversationId={conversationKey}
            toggleSidenav={() => setIsSidenavOpen(!isSidenavOpen)}
          />
        </div>
      </div>
    </>
  );
};

const ChatSideNav = ({
  isOpen,
  setIsSidenavOpen,
  isOnline,
}: {
  isOpen: boolean;
  setIsSidenavOpen: (newIsOpen: boolean) => void;
  isOnline: boolean;
}) => {
  const { conversationKey } = useParams();
  const { logout } = useAuth();

  const navigate = useNavigate();

  const newChatMatch = useMatch({ path: `${CHAT_ROOT}/new` });
  const isCreateNew = !!newChatMatch;

  const newGroupChatMatch = useMatch({ path: `${CHAT_ROOT}/new-group` });
  const isCreateNewGroup = !!newGroupChatMatch;

  const rootChatMatch = useMatch({ path: CHAT_ROOT });
  const isRoot = !!rootChatMatch;

  const isActive = isOpen || isCreateNew || isCreateNewGroup || isRoot;

  return (
    <>
      <Sidenav disablePinning={true} hideMobileDrawer={!isOpen && !isRoot} logout={logout} />
      <div
        className={`${isActive ? 'translate-x-full' : 'translate-x-0'} ${
          isCreateNew || isCreateNewGroup ? '' : 'pb-14'
        }
        fixed bottom-0 left-[-100%] top-0 z-10 flex h-[100dvh] w-full flex-shrink-0 flex-col border-r bg-page-background transition-transform dark:border-r-slate-800 md:static md:max-w-xs md:translate-x-0 md:pb-0 lg:max-w-sm`}
      >
        {isCreateNew ? (
          <NewConversation />
        ) : isCreateNewGroup ? (
          <NewConversationGroup />
        ) : (
          <>
            <NavHeader
              closeSideNav={isRoot ? undefined : () => setIsSidenavOpen(false)}
              isOnline={isOnline}
            />
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
    </>
  );
};
