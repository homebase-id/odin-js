import { useParams, useMatch, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { ReactNode, Suspense, useEffect, useRef, useState } from 'react';
import {
  ActionGroup,
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

const STORAGE_KEY = 'COMMUNITY_NAV_OPEN';

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
      viewportWrapperRef.current?.style.removeProperty('left');
      viewportWrapperRef.current?.style.removeProperty('right');
    };

    const handler = () => {
      const visualViewportHeight = window.visualViewport?.height;
      const offsetTop = window.visualViewport?.offsetTop;

      // Firefox on Android seems to have a bug where the visualViewport and innerHeight are not the exact same 0.1px differences
      const roundedViewportHeight =
        window.visualViewport?.height && Math.round(window.visualViewport?.height / 10) * 10;
      const roundedInnerHeight = Math.round(window.innerHeight / 10) * 10;

      if (roundedViewportHeight && (roundedViewportHeight !== roundedInnerHeight || !!offsetTop)) {
        viewportWrapperRef.current?.style.setProperty('height', `${visualViewportHeight}px`);
        viewportWrapperRef.current?.style.setProperty('position', `fixed`);
        if (offsetTop !== undefined) {
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

  const storedState = localStorage.getItem(STORAGE_KEY);
  const [isPinned, setIsPinned] = useState(storedState ? storedState === '1' : false);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isPinned ? '1' : '0');
  }, [isPinned]);

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
          <CommunitySideNav togglePin={(newVal) => setIsPinned((old) => newVal ?? !old)} />
        </ErrorBoundary>

        {isCreateNew ? (
          <NewCommunity />
        ) : (
          <>
            <ErrorBoundary>
              <CommunityChannelNav isOnline={isOnline} isHidden={isPinned} />
            </ErrorBoundary>

            {children ? (
              <Suspense>
                <ErrorBoundary>{children}</ErrorBoundary>
              </Suspense>
            ) : null}
          </>
        )}
      </div>
    </>
  );
};

const CommunitySideNav = ({ togglePin }: { togglePin: (newVal?: boolean) => void }) => {
  const isReactNative = window.localStorage.getItem('client_type')?.startsWith('react-native');

  const rootChatMatch = useMatch({ path: COMMUNITY_ROOT_PATH });
  const communityHomeChatMatch = useMatch({
    path: `${COMMUNITY_ROOT_PATH}/:odinKey/:communityKey`,
    end: true,
  });
  const isRoot = !!rootChatMatch || !!communityHomeChatMatch;

  const isActive = !!rootChatMatch;

  return (
    <>
      {!isReactNative ? <Sidenav disablePinning={true} hideMobileDrawer={!isRoot} /> : null}
      <div
        className={`${isActive ? 'translate-x-full' : 'translate-x-0'} fixed bottom-0 left-[-100%] top-0 z-[1] flex h-[100dvh] w-full flex-shrink-0 flex-col bg-page-background transition-transform lg:relative lg:left-0 lg:max-w-[4rem] lg:translate-x-0`}
      >
        <ErrorBoundary>
          <div className="absolute inset-0 flex flex-grow flex-col md:pl-[calc(env(safe-area-inset-left)+4.3rem)] lg:items-center lg:pl-0">
            <div className="flex flex-row items-center gap-2 px-4 pb-2 pt-4 md:static">
              <RadioTower className="h-7 w-7" />
              <span className="lg:hidden">{t('Homebase Community')}</span>
            </div>
            <CommunitiesList togglePin={togglePin} />
          </div>
        </ErrorBoundary>
      </div>
    </>
  );
};

const CommunitiesList = ({ togglePin }: { togglePin: (newVal?: boolean) => void }) => {
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
          togglePin={togglePin}
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
          className={`flex w-full items-center justify-center rounded-2xl p-[0.606rem] lg:aspect-square`}
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
  togglePin,
}: {
  community: HomebaseFile<CommunityDefinition>;
  isActive: boolean;
  togglePin: (newVal?: boolean) => void;
}) => {
  return (
    <div className={`w-full px-2 py-2 ${isActive ? 'bg-primary/20' : ''}`}>
      <Link
        to={`${COMMUNITY_ROOT_PATH}/${community.fileMetadata.senderOdinId}/${community.fileMetadata.appData.uniqueId}`}
        className="flex aspect-auto flex-row items-center gap-4 rounded-lg rounded-l-2xl border bg-background lg:block lg:aspect-square lg:rounded-none lg:border-0 lg:bg-transparent"
        onClick={(e) => {
          if (isActive) {
            togglePin();
            e.stopPropagation();
            e.preventDefault();
            return;
          } else {
            togglePin(true);
          }
        }}
      >
        <span
          className="flex aspect-square w-16 flex-row items-center justify-center rounded-2xl p-2 text-lg uppercase leading-none text-white hover:shadow-md lg:w-full"
          style={{
            backgroundColor: getOdinIdColor(community.fileMetadata.appData.content.title).darkTheme,
          }}
        >
          {community.fileMetadata.appData.content.title.slice(0, 2)}
        </span>
        <span className="text-lg lg:hidden">{community.fileMetadata.appData.content.title}</span>
      </Link>
    </div>
  );
};
