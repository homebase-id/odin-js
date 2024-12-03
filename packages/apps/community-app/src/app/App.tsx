import { lazy, ReactNode, Suspense } from 'react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useLocation,
  useParams,
} from 'react-router-dom';

import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Layout, MinimalLayout } from '../components/ui/Layout/Layout';
import './App.css';
import {
  COMMUNITY_ROOT_PATH,
  DotYouClientProvider,
  ErrorBoundary,
  NotFound,
  OdinQueryClient,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { useValidateAuthorization } from '../hooks/auth/useAuth';

const REACT_QUERY_INCLUDED_QUERY_KEYS = [
  // Community specific
  'process-community-inbox',
  'communities',
  'community',
  'community-metadata',
  'community-channels',
  'community-messages',
  'channels-with-recent-message',

  // Chat specific:
  'chat-message',
  'chat-messages',
  'chat-reaction',
  'conversations',
  'conversation-metadata',
];
const AUTH_PATH = COMMUNITY_ROOT_PATH + '/auth';
const AUTH_FINALIZE_PATH = COMMUNITY_ROOT_PATH + '/auth/finalize';

const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));

const CommunityHome = lazy(() =>
  import('../templates/Community/CommunityHome').then((communityApp) => ({
    default: communityApp.CommunityHome,
  }))
);

const CommunityChannelDetail = lazy(() =>
  import('../templates/Community/CommunityChannelDetail').then((communityApp) => ({
    default: communityApp.CommunityChannelDetail,
  }))
);
const CommunityCatchup = lazy(() =>
  import('../templates/Community/CommunityCatchup').then((communityApp) => ({
    default: communityApp.CommunityCatchup,
  }))
);
const CommunityLater = lazy(() =>
  import('../templates/Community/CommunityLater').then((communityApp) => ({
    default: communityApp.CommunityLater,
  }))
);
const CommunityDirectDetail = lazy(() =>
  import('../templates/Community/CommunityDirectDetail').then((communityApp) => ({
    default: communityApp.CommunityDirectDetail,
  }))
);

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route
          path={COMMUNITY_ROOT_PATH}
          element={
            <ErrorBoundary>
              <RootRoute>
                <Suspense fallback={<div className="h-full w-full bg-pink-500"></div>}>
                  <Outlet />
                </Suspense>
              </RootRoute>
            </ErrorBoundary>
          }
        >
          <Route path="auth" element={<Auth />}></Route>
          <Route path="auth/finalize" element={<FinalizeAuth />}></Route>

          {/* Chat: */}
          <Route
            path=""
            element={
              <Layout>
                <Outlet />
              </Layout>
            }
          >
            <Route index={true} element={<CommunityHome />} />
            <Route path={'new'} element={<CommunityHome />} />
            <Route
              path={':odinKey/:communityKey'}
              element={
                <CommunityHome>
                  <Outlet />
                </CommunityHome>
              }
            >
              <Route index={true} element={<CommunityRootRoute />} />

              {/* Items for 'all' */}
              <Route path={'all'} element={<CommunityCatchup />} />
              <Route path={'all/:chatMessageKey'} element={<CommunityCatchup />} />
              <Route path={'all/:chatMessageKey/:mediaKey'} element={<CommunityCatchup />} />

              {/* Items for 'all' within a thread */}
              <Route path={'all/:threadKey/thread'} element={<CommunityCatchup />} />
              <Route
                path={'all/:threadKey/thread/:chatMessageKey'}
                element={<CommunityCatchup />}
              />
              <Route
                path={'all/:threadKey/thread/:chatMessageKey/:mediaKey'}
                element={<CommunityCatchup />}
              />

              {/* Items for 'later' */}
              <Route path={'later'} element={<CommunityLater />} />

              {/* Items for 'channel' */}
              <Route path={':channelKey'} element={<CommunityChannelDetail />} />
              <Route path={':channelKey/:chatMessageKey'} element={<CommunityChannelDetail />} />
              <Route
                path={':channelKey/:chatMessageKey/edit'}
                element={<CommunityChannelDetail />}
              />
              <Route
                path={':channelKey/:chatMessageKey/:mediaKey'}
                element={<CommunityChannelDetail />}
              />

              {/* Items for 'channel' within a thread*/}
              <Route path={':channelKey/:threadKey/thread'} element={<CommunityChannelDetail />} />
              <Route
                path={':channelKey/:threadKey/thread/:chatMessageKey'}
                element={<CommunityChannelDetail />}
              />
              <Route
                path={':channelKey/:threadKey/thread/:chatMessageKey/edit'}
                element={<CommunityChannelDetail />}
              />
              <Route
                path={':channelKey/:threadKey/thread/:chatMessageKey/:mediaKey'}
                element={<CommunityChannelDetail />}
              />

              {/* Items for 'direct'*/}
              <Route path={'direct'} element={<NavigateToCommunityRoot />} />
              <Route path={'direct/:dmKey'} element={<CommunityDirectDetail />} />
              <Route path={'direct/:dmKey/:chatMessageKey'} element={<CommunityDirectDetail />} />
              <Route
                path={'direct/:dmKey/:chatMessageKey/:mediaKey'}
                element={<CommunityDirectDetail />}
              />
            </Route>
          </Route>

          <Route
            path="*"
            element={
              <MinimalLayout>
                <Suspense fallback={<></>}>
                  <NotFound />
                </Suspense>
              </MinimalLayout>
            }
          />
        </Route>
      </>
    )
  );

  return (
    <HelmetProvider>
      <Helmet>
        <meta name="v" content={import.meta.env.VITE_VERSION} />
      </Helmet>
      <OdinQueryClient
        cacheKey={'APP_REACT_QUERY_OFFLINE_CACHE'}
        cachedQueryKeys={REACT_QUERY_INCLUDED_QUERY_KEYS}
        type="indexeddb"
      >
        <DotYouClientProvider>
          <RouterProvider router={router} fallbackElement={<></>} />
        </DotYouClientProvider>
      </OdinQueryClient>
    </HelmetProvider>
  );
}

const CommunityRootRoute = () => {
  const { odinKey, communityKey } = useParams();
  return window.innerWidth > 1024 ? (
    <Navigate to={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/all`} />
  ) : null;
};

const NavigateToCommunityRoot = () => {
  const { odinKey, communityKey } = useParams();
  return <Navigate to={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}`} />;
};

const RootRoute = ({ children }: { children: ReactNode }) => {
  useValidateAuthorization();
  const location = useLocation();

  const isAuthenticated = useDotYouClientContext().isAuthenticated();

  if (!isAuthenticated) {
    if (location.pathname === AUTH_PATH || location.pathname === AUTH_FINALIZE_PATH)
      return <>{children}</>;

    console.debug('[NOT AUTHENTICATED]: Redirect to login');
    return (
      <Navigate
        to={`${AUTH_PATH}?returnUrl=${encodeURIComponent(location.pathname + location.search)}`}
      />
    );
  }

  return <>{children}</>;
};

export default App;
