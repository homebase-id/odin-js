import { useParams, useMatch, useNavigate, useLocation, Navigate } from 'react-router-dom';

import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActionGroup,
  ActionLink,
  COMMUNITY_APP_ID,
  COMMUNITY_ROOT_PATH,
  ErrorBoundary,
  ExtendPermissionDialog,
  getOdinIdColor,
  Sidenav,
  t,
  useRemoveNotifications,
} from '@homebase-id/common-app';
import { drives, permissions } from '../../hooks/auth/useAuth';
import { Helmet } from 'react-helmet-async';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useCommunities } from '../../hooks/community/useCommunities';
import { NewCommunity } from './CommunityNew';
import { useLiveCommunityProcessor } from '../../hooks/community/live/useLiveCommunityProcessor';
import { RadioTower, Plus, Ellipsis, MagnifyingGlass, Loader } from '@homebase-id/common-app/icons';
import { CommunityChannelNav } from './CommunityChannelNav';
import { useCommunityMemberUpdater } from '../../hooks/community/useCommunityMemberUpdater';
import { ExtendCriclePermissionDialog } from '../../components/Auth/ExtendCirclePermissionDialog';
import { useCommunityNotifications } from '../../hooks/community/useCommunityNotifications';

const LOCAL_STORAGE_KEY = 'COMMUNITY_LATEST_PATH';
export const CommunityHome = ({ children }: { children?: ReactNode }) => {
  const newCommunity = useMatch({ path: `${COMMUNITY_ROOT_PATH}/new` });
  const { odinKey, communityKey } = useParams();
  const isCreateNew = !!newCommunity;

  const isOnline = useLiveCommunityProcessor(odinKey, communityKey);
  useCommunityMemberUpdater(odinKey, communityKey);
  useRemoveNotifications({ appId: COMMUNITY_APP_ID });
  useCommunityNotifications(odinKey, communityKey);

  const { data: communities } = useCommunities().all;

  const location = useLocation();
  useEffect(() => {
    if (!communityKey || isCreateNew) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, location.pathname);
  }, [location.pathname]);

  const viewportWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cleanupStyle = () => {
      viewportWrapperRef.current?.style.removeProperty('height');
      viewportWrapperRef.current?.style.removeProperty('position');
      viewportWrapperRef.current?.style.removeProperty('top');
      viewportWrapperRef.current?.style.removeProperty('bottom');
    };

    const handler = () => {
      const visualViewportHeight = window.visualViewport?.height;
      const offsetTop = window.visualViewport?.offsetTop;

      if (
        window.visualViewport?.height &&
        (window.visualViewport?.height !== window.innerHeight || !!offsetTop)
      ) {
        viewportWrapperRef.current?.style.setProperty('height', `${visualViewportHeight}px`);
        viewportWrapperRef.current?.style.setProperty('position', `fixed`);
        if (offsetTop) {
          viewportWrapperRef.current?.style.setProperty('top', `${offsetTop}px`);
        } else {
          viewportWrapperRef.current?.style.setProperty('bottom', `0`);
        }
        viewportWrapperRef.current?.style.setProperty('left', `0`);
        viewportWrapperRef.current?.style.setProperty('right', `0`);
        viewportWrapperRef.current?.style.setProperty('width', `100%`);
      } else {
        cleanupStyle();
      }
    };

    window.visualViewport?.addEventListener('resize', handler);
    return () => {
      window.visualViewport?.removeEventListener('resize', handler);
      cleanupStyle();
    };
  }, []);

  if (communities && !communityKey && !isCreateNew) {
    if (!location.state?.referrer || !location.state?.referrer.startsWith(COMMUNITY_ROOT_PATH)) {
      const lastPath = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (lastPath) return <Navigate to={lastPath} replace />;

      if (communities[0])
        return (
          <Navigate
            to={`${COMMUNITY_ROOT_PATH}/${communities[0].fileMetadata.senderOdinId}/${communities[0].fileMetadata.appData.uniqueId}`}
            replace
          />
        );
      else return <Navigate to={`${COMMUNITY_ROOT_PATH}/new`} replace />;
    }
  }

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
      />
      <ExtendCriclePermissionDialog />
      <div className={`flex h-[100dvh] w-full flex-row overflow-hidden`} ref={viewportWrapperRef}>
        <ErrorBoundary>
          <CommunitySideNav />
        </ErrorBoundary>
        {isCreateNew ? (
          <NewCommunity />
        ) : (
          <>
            <ErrorBoundary>
              <CommunityChannelNav isOnline={isOnline} />
            </ErrorBoundary>
            {children ? <>{children}</> : null}
          </>
        )}
      </div>
    </>
  );
};

const CommunitySideNav = () => {
  const rootChatMatch = useMatch({ path: COMMUNITY_ROOT_PATH });
  const communityHomeChatMatch = useMatch({
    path: `${COMMUNITY_ROOT_PATH}/:odinKey/:communityKey`,
    end: true,
  });
  const isRoot = !!rootChatMatch || !!communityHomeChatMatch;

  const isActive = !!rootChatMatch;

  return (
    <>
      <Sidenav disablePinning={true} hideMobileDrawer={!isRoot} />
      <div
        className={`${isActive ? 'translate-x-full' : 'translate-x-0'} fixed bottom-0 left-[-100%] top-0 z-[1] flex h-[100dvh] w-full flex-shrink-0 flex-col bg-page-background transition-transform lg:relative lg:left-0 lg:max-w-[4rem] lg:translate-x-0`}
      >
        <ErrorBoundary>
          <div className="absolute inset-0 flex flex-grow flex-row flex-wrap items-start md:pl-[calc(env(safe-area-inset-left)+4.3rem)] lg:flex-col lg:items-center lg:pl-0">
            <div className="px-4 pb-2 pt-4">
              <RadioTower className="h-7 w-7" />
            </div>
            <CommunitiesList />
          </div>
        </ErrorBoundary>
      </div>
    </>
  );
};

const CommunitiesList = () => {
  const [isEnableDiscovery, setIsEnableDiscovery] = useState(false);
  const {
    data: communities,
    isFetched,
    refetch: refetchCommunities,
    isRefetching: isRefetchingCommunities,
  } = useCommunities(isEnableDiscovery).all;
  const { communityKey: activeCommunityId } = useParams();

  const navigate = useNavigate();

  if (!isFetched) return null;

  return (
    <>
      {communities?.map((conversation) => (
        <CommunityListItem
          key={conversation.fileId}
          community={conversation}
          isActive={stringGuidsEqual(activeCommunityId, conversation.fileMetadata.appData.uniqueId)}
        />
      ))}

      <div className={`px-2 py-2`}>
        <ActionGroup
          options={[
            {
              label: 'Discover accessible communities',
              onClick: () => {
                setIsEnableDiscovery(true);

                setTimeout(() => refetchCommunities(), 100);
              },
              icon: MagnifyingGlass,
            },
            {
              label: 'Create a new community',
              onClick: () => navigate(`${COMMUNITY_ROOT_PATH}/new`),
              icon: Plus,
            },
          ]}
          type={'mute'}
          size={'none'}
          className={`flex aspect-square w-full items-center justify-center rounded-2xl p-[0.606rem]`}
        >
          {isRefetchingCommunities && isEnableDiscovery ? (
            <Loader className="h-6 w-6" />
          ) : (
            <Ellipsis className="h-6 w-6" />
          )}
        </ActionGroup>
      </div>
    </>
  );
};

const CommunityListItem = ({
  community,
  isActive,
}: {
  community: HomebaseFile<CommunityDefinition>;
  isActive: boolean;
}) => {
  return (
    <div className={`px-2 py-2 ${isActive ? 'bg-primary/20' : ''}`}>
      <ActionLink
        href={`${COMMUNITY_ROOT_PATH}/${community.fileMetadata.senderOdinId}/${community.fileMetadata.appData.uniqueId}`}
        className={`aspect-square w-full rounded-2xl p-4 uppercase hover:shadow-md`}
        style={{
          backgroundColor: getOdinIdColor(community.fileMetadata.appData.content.title).darkTheme,
        }}
      >
        {community.fileMetadata.appData.content.title.slice(0, 2)}
      </ActionLink>
    </div>
  );
};
