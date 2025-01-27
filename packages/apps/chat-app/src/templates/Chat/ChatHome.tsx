import { useLiveChatProcessor } from '../../hooks/chat/live/useLiveChatProcessor';
import { useNavigate, useParams, useMatch } from 'react-router-dom';

import { ChatDetail } from './ChatDetail';

import { NewConversation } from '../../components/Chat/Conversations/Sidenav/NewConversation';
import { NewConversationGroup } from '../../components/Chat/Conversations/Sidenav/NewConversationGroup';
import { ConversationsSidebar } from '../../components/Chat/Conversations/Sidenav/ConversationsSidenav';
import { NavHeader } from '../../components/Chat/Conversations/Sidenav/NavHeader';
import {
  CHAT_APP_ID,
  CHAT_ROOT_PATH,
  ErrorBoundary,
  ExtendPermissionDialog,
  Sidenav,
  t,
  useRemoveNotifications,
} from '@homebase-id/common-app';
import { drives, circleDrives, permissions } from '../../hooks/auth/useAuth';
import { Helmet } from 'react-helmet-async';
import { EditConversationGroup } from '../../components/Chat/Conversations/Sidenav/EditConversationGroup';
import { StarredChatMessages } from '../../components/Chat/Starred/StarredChatMessages';
import React, { useCallback } from 'react';

export const ChatHome = () => {
  const { conversationKey } = useParams();

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
        circleDrives={circleDrives}
        permissions={permissions}
      />
      <div className={`flex h-[100dvh] w-full flex-row overflow-hidden`}>
        <ChatSideNav isOnline={isOnline} />
        <div className="h-full w-20 flex-grow bg-background">
          <ChatDetail conversationId={conversationKey} />
        </div>
      </div>
    </>
  );
};

const ChatSideNav = ({ isOnline }: { isOnline: boolean }) => {
  const { conversationKey } = useParams();

  const navigate = useNavigate();

  const newChatMatch = useMatch({ path: `${CHAT_ROOT_PATH}/new` });
  const isCreateNew = !!newChatMatch;

  const newGroupChatMatch = useMatch({ path: `${CHAT_ROOT_PATH}/new-group` });
  const isCreateNewGroup = !!newGroupChatMatch;

  const editChatMatch = useMatch({ path: `${CHAT_ROOT_PATH}/:conversationKey/edit` });
  const isEditConversation = !!editChatMatch;

  const starredMatch = useMatch({ path: `${CHAT_ROOT_PATH}/starred` });
  const isStarred = !!starredMatch;

  const rootChatMatch = useMatch({ path: CHAT_ROOT_PATH });
  const isRoot = !!rootChatMatch;

  const isActive = isCreateNew || isCreateNewGroup || isEditConversation || isRoot;

  const doOpenConversation = useCallback(
    (newId: string | undefined) => {
      navigate({
        pathname: `${CHAT_ROOT_PATH}/${newId}`,
        search: window.location.search,
      });
    },
    [navigate]
  );

  return (
    <>
      <Sidenav disablePinning={true} hideMobileDrawer={!isRoot} />
      <div
        className={`${isActive ? 'translate-x-full' : 'translate-x-0'} ${
          isCreateNew || isCreateNewGroup || isEditConversation ? '' : 'pb-14'
        } fixed bottom-0 left-[-100%] top-0 z-10 flex h-[100dvh] w-full flex-shrink-0 flex-col border-r bg-page-background transition-transform dark:border-r-slate-800 md:pl-[calc(env(safe-area-inset-left)+4.3rem)] lg:static lg:max-w-sm lg:translate-x-0 lg:pb-0 lg:pl-0`}
      >
        <ErrorBoundary>
          {isCreateNew ? (
            <NewConversation />
          ) : isCreateNewGroup ? (
            <NewConversationGroup />
          ) : isEditConversation ? (
            <EditConversationGroup />
          ) : isStarred ? (
            <>
              <NavHeader isOnline={isOnline} />
              <StarredChatMessages />
            </>
          ) : (
            <React.Fragment
              key={
                isCreateNew || isCreateNewGroup || isEditConversation || isStarred
                  ? 'other'
                  : 'root'
              }
            >
              <NavHeader isOnline={isOnline} />
              <ConversationsSidebar
                activeConversationId={conversationKey}
                openConversation={doOpenConversation}
                key="conversations-sidebar"
              />
            </React.Fragment>
          )}
        </ErrorBoundary>
      </div>
    </>
  );
};
