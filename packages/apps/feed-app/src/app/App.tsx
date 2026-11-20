import { lazy, ReactNode, Suspense } from 'react';
import {
  Route,
  Outlet,
  Navigate,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  useLocation,
  useParams,
} from 'react-router-dom';

import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Layout, MinimalLayout, NoLayout } from '../components/ui/Layout/Layout';

const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));

const SocialFeed = lazy(() => import('../templates/SocialFeed/SocialFeed'));
const NavigateToReferencedPost = lazy(() =>
  import('../templates/SocialFeed/NavigateToReferencedPost').then((module) => ({
    default: module.NavigateToReferencedPost,
  }))
);

const ArticleReaderPage = lazy(() => import('../templates/SocialFeed/ArticleReaderPage'));
const ChannelsPage = lazy(() => import('../templates/SocialFeed/ChannelsPage'));
const IncomingCollaborativeChannelPage = lazy(
  () => import('../templates/SocialFeed/IncomingCollaborativeChannelPage')
);

import 'katex/dist/katex.min.css';
import './App.css';

const AUTH_PATH = FEED_ROOT_PATH + '/auth';
const AUTH_FINALIZE_PATH = FEED_ROOT_PATH + '/auth/finalize';

import {
  DotYouClientProvider,
  ErrorBoundary,
  FEED_ROOT_PATH,
  NotFound,
  OdinQueryClient,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { useValidateAuthorization } from '../hooks/auth/useAuth';

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route
          path={FEED_ROOT_PATH}
          element={
            <ErrorBoundary>
              <RootRoute>
                <Suspense fallback={<></>}>
                  <Outlet />
                </Suspense>
              </RootRoute>
            </ErrorBoundary>
          }
        >
          <Route path="auth" element={<Auth />}></Route>
          <Route path="auth/finalize" element={<FinalizeAuth />}></Route>

          {/* Feed: */}
          <Route
            path=""
            element={
              <Layout>
                <Outlet />
              </Layout>
            }
          >
            <Route index={true} element={<SocialFeed />} />
            <Route path="preview/:postKey" element={<NavigateToReferencedPost />} />
            <Route path="preview/:identityKey/:channelKey/:postKey" element={<SocialFeed />} />
            <Route
              path="preview/:identityKey/:channelKey/:postKey/:attachmentKey"
              element={<SocialFeed />}
            />
            {/* Articles are written in Journal; old authoring links land on the feed or the reader */}
            <Route path="new" element={<Navigate to={FEED_ROOT_PATH} replace={true} />} />
            <Route path="articles" element={<Navigate to={FEED_ROOT_PATH} replace={true} />} />
            <Route path="channels" element={<ChannelsPage />} />
            <Route path="edit/:channelKey/:postKey" element={<NavigateToReader />} />
            <Route path="edit/:identityKey/:channelKey/:postKey" element={<NavigateToReader />} />
            <Route path="duplicate/:channelKey/:postKey" element={<NavigateToReader />} />

            <Route
              path="channels/incoming-collaborative"
              element={<IncomingCollaborativeChannelPage />}
            />
          </Route>

          {/* An article, full page: */}
          <Route
            path="read/:identityKey/:channelKey/:postKey"
            element={
              <NoLayout noShadedBg={true}>
                <ArticleReaderPage />
              </NoLayout>
            }
          />

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
      <OdinQueryClient app="app" type="indexeddb">
        <DotYouClientProvider>
          <RouterProvider router={router} />
        </DotYouClientProvider>
      </OdinQueryClient>
    </HelmetProvider>
  );
}

/** The article's reader page, for the old edit/duplicate links; no identity in the link means our own */
const NavigateToReader = () => {
  const { identityKey, channelKey, postKey } = useParams();
  const dotYouClient = useDotYouClientContext();

  return (
    <Navigate
      to={`${FEED_ROOT_PATH}/read/${identityKey || dotYouClient.getHostIdentity()}/${channelKey}/${postKey}`}
      replace={true}
    />
  );
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
