import { useParams, useMatch, useLocation, Navigate } from 'react-router-dom';
import { ReactNode, Suspense, useEffect, useRef, useState } from 'react';
import {
  COMMUNITY_APP_ID,
  COMMUNITY_ROOT_PATH,
  ErrorBoundary,
  ExtendPermissionDialog,
  t,
  useRemoveNotifications,
} from '@homebase-id/common-app';
import { drives, permissions } from '../../hooks/auth/useAuth';
import { Helmet } from 'react-helmet-async';
import { useCommunities } from '../../hooks/community/useCommunities';
import { NewCommunity } from './CommunityNew';
import { useLiveCommunityProcessor } from '../../hooks/community/live/useLiveCommunityProcessor';
import { CommunityNav } from './CommunityNav';
import { useCommunityMemberUpdater } from '../../hooks/community/useCommunityMemberUpdater';
import { ExtendCriclePermissionDialog } from '../../components/Auth/ExtendCirclePermissionDialog';
import { useCommunityNotifications } from '../../hooks/community/useCommunityNotifications';
import { CommunitiesNav } from './CommunitiesNav';

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
      document.body.style.removeProperty('overflow');
    };

    const handler = () => {
      // Set timeout because the visualViewport height is not always updated immediately
      setTimeout(() => {
        const visualViewportHeight = window.visualViewport?.height;
        const offsetTop = window.visualViewport?.offsetTop;

        // Firefox on Android seems to have a bug where the visualViewport and innerHeight are not the exact same 0.1px differences
        const roundedViewportHeight =
          visualViewportHeight && Math.round(visualViewportHeight / 10) * 10;
        const roundedInnerHeight = Math.round(window.innerHeight / 10) * 10;

        if (
          roundedViewportHeight &&
          (roundedViewportHeight !== roundedInnerHeight || !!offsetTop)
        ) {
          // We try and disable the page from scrolling when the keyboard is open; To avoid scrolling past the visual page that is contained within the viewport
          document.body.style.setProperty('overflow', 'hidden');
        } else {
          cleanupStyle();
        }
      }, 0);
    };

    window.visualViewport?.addEventListener('resize', handler);
    return () => {
      window.visualViewport?.removeEventListener('resize', handler);
      cleanupStyle();
    };
  }, []);

  const storedState = localStorage.getItem(STORAGE_KEY);
  const [isHidden, setIsHidden] = useState(storedState ? storedState !== '1' : true);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, !isHidden ? '1' : '0');
  }, [isHidden]);

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
      <div
        className={`flex h-[100dvh] w-full flex-row overflow-hidden pb-[env(safe-area-inset-bottom)]`}
        ref={viewportWrapperRef}
      >
        <ErrorBoundary>
          <CommunitiesNav togglePin={(newVal) => setIsHidden((old) => newVal ?? !old)} />
        </ErrorBoundary>

        {isCreateNew ? (
          <NewCommunity />
        ) : (
          <>
            <ErrorBoundary>
              <CommunityNav isOnline={isOnline} isHidden={!isHidden} />
            </ErrorBoundary>

            <Suspense>
              <ErrorBoundary>{children}</ErrorBoundary>
            </Suspense>
          </>
        )}
      </div>
    </>
  );
};
