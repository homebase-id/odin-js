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
  OdinClientProvider,
  ErrorBoundary,
  NotFound,
  OdinQueryClient,
  useOdinClientContext,
} from '@homebase-id/common-app';
import { useValidateAuthorization } from '../hooks/auth/useAuth';

const AUTH_PATH = COMMUNITY_ROOT_PATH + '/auth';
const AUTH_FINALIZE_PATH = COMMUNITY_ROOT_PATH + '/auth/finalize';

const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));

const CommunityNotificationRedirect = lazy(() =>
  import('../templates/Community/CommunityNotificationRedirect').then((communityApp) => ({
    default: communityApp.CommunityNotificationRedirect,
  }))
);
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
const CommunityChannelsCatchup = lazy(() =>
  import('../templates/Community/CommunityChannelsCatchup').then((communityApp) => ({
    default: communityApp.CommunityChannelsCatchup,
  }))
);
const CommunityThreadsCatchup = lazy(() =>
  import('../templates/Community/CommunityThreadsCatchup').then((communityApp) => ({
    default: communityApp.CommunityThreadsCatchup,
  }))
);
const CommunityLater = lazy(() =>
  import('../templates/Community/CommunityLater').then((communityApp) => ({
    default: communityApp.CommunityLater,
  }))
);
const CommunityPins = lazy(() =>
  import('../templates/Community/CommunityLater').then((communityApp) => ({
    default: communityApp.CommunityPins,
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
              path={'redirect/:communityKey/:messageKey'}
              element={<CommunityNotificationRedirect />}
            />
            <Route
              path={':odinKey/:communityKey'}
              element={
                <CommunityHome>
                  <Outlet />
                </CommunityHome>
              }
            >
              <Route index={true} element={<CommunityRootRoute />} />

              {/* Items for 'global' */}
              <Route path={'threads'} element={<CommunityThreadsCatchup />} />
              <Route path={'later'} element={<CommunityLater />} />
              <Route path={'pins'} element={<CommunityPins />} />

              {/* Items for 'activity' */}
              <Route path={'activity'} element={<CommunityChannelsCatchup />} />
              <Route path={'activity/:chatMessageKey'} element={<CommunityChannelsCatchup />} />
              <Route
                path={'activity/:chatMessageKey/:mediaKey'}
                element={<CommunityChannelsCatchup />}
              />

              {/* Items for 'channel' */}
              <Route path={':channelKey'} element={<CommunityChannelDetail />} />
              <Route path={':channelKey/pins'} element={<CommunityChannelDetail />} />
              <Route path={':channelKey/info'} element={<CommunityChannelDetail />} />
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
    ),
    {
      future: {
        v7_relativeSplatPath: true,
      },
    }
  );

  return (
    <HelmetProvider>
      <Helmet>
        <meta name="v" content={import.meta.env.VITE_VERSION} />
      </Helmet>
      <OdinQueryClient app="app" type="indexeddb">
        <OdinClientProvider>
          <RouterProvider
            router={router}
            fallbackElement={<></>}
            future={{
              v7_startTransition: true,
            }}
          />
        </OdinClientProvider>
      </OdinQueryClient>
    </HelmetProvider>
  );
}

const CommunityRootRoute = () => {
  const { odinKey, communityKey } = useParams();
  return window.innerWidth > 1024 ? (
    <Navigate to={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/activity`} />
  ) : null;
};

const NavigateToCommunityRoot = () => {
  const { odinKey, communityKey } = useParams();
  return <Navigate to={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}`} />;
};

const RootRoute = ({ children }: { children: ReactNode }) => {
  useValidateAuthorization();
  const location = useLocation();

  const isAuthenticated = useOdinClientContext().isAuthenticated();

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
