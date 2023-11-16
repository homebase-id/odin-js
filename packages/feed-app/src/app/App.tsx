import { lazy, ReactNode, Suspense } from 'react';
import {
  Route,
  Outlet,
  Navigate,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom';

import { Helmet, HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Layout, { MinimalLayout } from '../components/ui/Layout/Layout';

const About = lazy(() => import('../templates/About/About'));
const Auth = lazy(() => import('../templates/Auth/Auth'));
const FinalizeAuth = lazy(() => import('../templates/Auth/FinalizeAuth'));

const SocialFeed = lazy(() => import('../templates/SocialFeed/SocialFeed'));
const ArticleComposerPage = lazy(() => import('../templates/SocialFeed/ArticleComposerPage'));
const ArticlesPage = lazy(() => import('../templates/SocialFeed/ArticlesPage'));
const ChannelsPage = lazy(() => import('../templates/SocialFeed/ChannelsPage'));

import '@youfoundation/ui-lib/dist/style.css';
import './App.css';
import { useAuth } from '../hooks/auth/useAuth';

export const ROOT_PATH = '';
const AUTH_PATH = ROOT_PATH + '/auth';

import { ErrorBoundary, NotFound } from '@youfoundation/common-app';

const queryClient = new QueryClient();

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route
          path={ROOT_PATH}
          element={
            <ErrorBoundary>
              <Suspense fallback={<></>}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          }
        >
          <Route path="about" element={<About />}></Route>
          <Route path="auth" element={<Auth />}></Route>
          <Route path="auth/finalize" element={<FinalizeAuth />}></Route>

          {/* Feed: */}
          <Route
            path=""
            element={
              <RootRoute>
                <Layout>
                  <Outlet />
                </Layout>
              </RootRoute>
            }
          >
            <Route index={true} element={<SocialFeed />} />
            <Route path="preview/:identityKey/:channelKey/:postKey" element={<SocialFeed />} />
            <Route
              path="preview/:identityKey/:channelKey/:postKey/:attachmentKey"
              element={<SocialFeed />}
            />
            <Route path="new" element={<ArticleComposerPage />} />
            <Route path="articles" element={<ArticlesPage />} />
            <Route path="channels" element={<ChannelsPage />} />
            <Route path="edit/:channelKey/:postKey" element={<ArticleComposerPage />} />
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
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} fallbackElement={<></>} />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const RootRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    if (window.location.pathname === AUTH_PATH) {
      return <>{children}</>;
    }

    console.debug('[NOT AUTHENTICATED]: Redirect to login');

    // It can happen that the RootRoute renders when we already are rendering Login, which would cause and endless url of returnUrls; So return early if it is the login already
    if (window.location.pathname === AUTH_PATH) {
      return <></>;
    }

    return <Navigate to={`${ROOT_PATH}/about`} />;
  }

  return <>{children}</>;
};

export default App;
