import { useNavigate, useParams, useMatch } from 'react-router-dom';

import { CommunityDetail } from './CommunityDetail';

import { ROOT_PATH } from '../../app/App';
import {
  COMMUNITY_APP_ID,
  ErrorBoundary,
  ExtendPermissionDialog,
  Sidenav,
  t,
  useRemoveNotifications,
} from '@youfoundation/common-app';
import { drives, permissions } from '../../hooks/auth/useAuth';
import { Helmet } from 'react-helmet-async';

export const COMMUNITY_ROOT = ROOT_PATH;

export const CommunityHome = () => {
  const { conversationKey } = useParams();

  // const isOnline = useLiveChatProcessor();
  useRemoveNotifications({ appId: COMMUNITY_APP_ID });

  return (
    <>
      <Helmet>
        <title>Homebase | Community</title>
      </Helmet>

      <ExtendPermissionDialog
        appName={t('Homebase Community')}
        appId={COMMUNITY_APP_ID}
        drives={drives}
        permissions={permissions}
        // needsAllConnected={true}
      />
      <div className={`flex h-[100dvh] w-full flex-row overflow-hidden`}>
        <CommunitySideNav isOnline={false} />
        <div className="h-full w-full flex-grow bg-background">
          <CommunityDetail conversationId={conversationKey} />
        </div>
      </div>
    </>
  );
};

const CommunitySideNav = ({ isOnline }: { isOnline: boolean }) => {
  const { conversationKey } = useParams();

  const navigate = useNavigate();

  const newChatMatch = useMatch({ path: `${COMMUNITY_ROOT}/new` });
  const isCreateNew = !!newChatMatch;

  const rootChatMatch = useMatch({ path: COMMUNITY_ROOT });
  const isRoot = !!rootChatMatch;

  const isActive = isCreateNew || isRoot;

  return (
    <>
      <Sidenav disablePinning={true} hideMobileDrawer={!isRoot} />
      <div
        className={`${isActive ? 'translate-x-full' : 'translate-x-0'} ${isCreateNew ? '' : 'pb-14'}
        fixed bottom-0 left-[-100%] top-0 z-10 flex h-[100dvh] w-full flex-shrink-0 flex-col border-r bg-page-background transition-transform dark:border-r-slate-800 md:pl-[calc(env(safe-area-inset-left)+4.3rem)] lg:static lg:max-w-sm lg:translate-x-0 lg:pb-0 lg:pl-0`}
      >
        <ErrorBoundary>
          {isCreateNew ? (
            <>{/* <NewConversation /> */}</>
          ) : (
            <>
              {/* <NavHeader isOnline={isOnline} /> */}
              {/* <ConversationsSidebar
                activeConversationId={conversationKey}
                openConversation={(newId) => {
                  navigate(`${COMMUNITY_ROOT}/${newId}`);
                }}
              /> */}
            </>
          )}
        </ErrorBoundary>
      </div>
    </>
  );
};
