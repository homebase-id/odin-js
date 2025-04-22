import { lazy, ReactNode, Suspense } from 'react';
import {
  Route,
  Outlet,
  Navigate,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  useLocation,
} from 'react-router-dom';

import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Layout, MinimalLayout } from '../components/ui/Layout/Layout';

const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));

const SocialFeed = lazy(() => import('../templates/SocialFeed/SocialFeed'));
const NavigateToReferencedPost = lazy(() =>
  import('../templates/SocialFeed/NavigateToReferencedPost').then((module) => ({
    default: module.NavigateToReferencedPost,
  }))
);

const ArticleComposerPage = lazy(() => import('../templates/SocialFeed/ArticleComposerPage'));
const ArticleDuplicatePage = lazy(() => import('../templates/SocialFeed/ArticleDuplicatePage'));
const ArticlesPage = lazy(() => import('../templates/SocialFeed/ArticlesPage'));
const ChannelsPage = lazy(() => import('../templates/SocialFeed/ChannelsPage'));
const IncomingCollaborativeChannelPage = lazy(
  () => import('../templates/SocialFeed/IncomingCollaborativeChannelPage')
);

import './App.css';

const AUTH_PATH = FEED_ROOT_PATH + '/auth';
const AUTH_FINALIZE_PATH = FEED_ROOT_PATH + '/auth/finalize';

import {
  OdinClientProvider,
  ErrorBoundary,
  FEED_ROOT_PATH,
  NotFound,
  OdinQueryClient,
  useOdinClientContext,
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
            <Route path="new" element={<ArticleComposerPage />} />
            <Route path="articles" element={<ArticlesPage />} />
            <Route path="channels" element={<ChannelsPage />} />
            <Route path="edit/:channelKey/:postKey" element={<ArticleComposerPage />} />
            <Route path="edit/:odinKey/:channelKey/:postKey" element={<ArticleComposerPage />} />
            <Route path="duplicate/:channelKey/:postKey" element={<ArticleDuplicatePage />} />

            <Route
              path="channels/incoming-collaborative"
              element={<IncomingCollaborativeChannelPage />}
            />
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
