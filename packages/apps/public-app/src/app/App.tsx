import { lazy, ReactNode, Suspense, useState } from 'react';
import {
  Route,
  Outlet,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  useSearchParams,
} from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Layout, NoLayout } from '../components/ui/Layout/Layout';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '@homebase-id/ui-lib/dist/style.css';
import './App.css';
import {
  DotYouClientProvider,
  ErrorBoundary,
  HOME_ROOT_PATH,
  NotFound,
  PREVIEW_ROOT,
} from '@homebase-id/common-app';
import { useAuth } from '../hooks/auth/useAuth';
import Header from '../components/ui/Layout/Header/Header';
import Footer from '../components/ui/Layout/Footer/Footer';

import { t, useSiteData } from '@homebase-id/common-app';
import { LoginBox } from '../components/Auth/LoginBox/LoginBox';

const Home = lazy(() => import('../templates/Home/Home'));
const PostOverview = lazy(() => import('../templates/Posts/Overview/PostOverview'));
const PostDetail = lazy(() => import('../templates/Posts/Detail/PostDetail'));
const PostImageDetail = lazy(() => import('../templates/Posts/Detail/PostImageDetail'));
const LinksPage = lazy(() => import('../templates/LinksPage/LinksPage'));
const PreviewPage = lazy(() => import('../templates/PreviewPage/PreviewPage'));
const YouAuthFinalizer = lazy(() => import('../templates/YouAuthFinalizer/YouAuthFinalizer'));

const Ping = lazy(() => import('../templates/Ping/Ping'));

const queryClient = new QueryClient();

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route
          path={HOME_ROOT_PATH}
          element={
            <Layout>
              <ErrorBoundary>
                <DotYouClientProvider>
                  <Suspense fallback={<></>}>
                    <Outlet />
                  </Suspense>
                </DotYouClientProvider>
              </ErrorBoundary>
            </Layout>
          }
        >
          <Route path="action" element={<ActionRedirect />} />
          <Route path="authorization-code-callback" element={<YouAuthFinalizer />} />
          <Route
            path=""
            element={
              <PublicRoute>
                <Header />
                <Outlet />
                <Footer className="mt-auto" />
              </PublicRoute>
            }
          >
            <Route index={true} element={<Home />} />
            <Route path="about" element={<Home />} />
            <Route path="links" element={<Home />} />
            <Route path="posts" element={<Home />} />
            <Route path="connections" element={<Home />} />

            <Route path="posts/:channelKey" element={<PostOverview />} />
            <Route path="posts/:channelKey/:postKey" element={<PostDetail />} />
            <Route path="posts/:channelKey/:postKey/:attachmentKey" element={<PostImageDetail />} />

            <Route path="linked" element={<LinksPage />} />

            <Route path="ping" element={<Ping />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
        <Route
          path={PREVIEW_ROOT}
          element={
            <NoLayout>
              <PreviewPage />
            </NoLayout>
          }
        />
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

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isOwner, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const { data: siteData, isFetched: siteDataFetched } = useSiteData();

  const [isLogin, setIsLogin] = useState(false);

  if (
    siteData &&
    siteDataFetched &&
    (!siteData.home?.templateSettings?.themeId || siteData.home?.templateSettings?.themeId === '0')
  ) {
    return (
      <div className="flex min-h-screen">
        <span className="m-auto text-center">
          {!isLogin ? (
            <>
              {t('This is a registered')}{' '}
              <a
                href="https://homebase.id"
                className="text-primary"
                target="_blank"
                rel="norerrer noreferrer"
              >
                Homebase
              </a>{' '}
              {t('identity')}
              {isOwner ? (
                <small className="mt-1 block">
                  {t('Select a website theme and make yourself known on the internet!')}{' '}
                  <a href="/owner/profile/homepage" className="underline">
                    {t('Start')}!
                  </a>
                </small>
              ) : !isAuthenticated ? (
                <small className="mt-1 block">
                  <a onClick={() => setIsLogin(true)} className="cursor-pointer underline">
                    {t('Login')}
                  </a>
                </small>
              ) : null}
            </>
          ) : (
            <>
              <LoginBox />
              <small className="block">
                <a onClick={() => setIsLogin(false)} className="cursor-pointer underline">
                  {t('Cancel')}
                </a>
              </small>
            </>
          )}
        </span>
      </div>
    );
  }

  // Remove the youauth-logon param from the url if we are alrady logged on
  if ((isAuthenticated || isOwner) && searchParams.has('youauth-logon'))
    window.history.replaceState(null, '', window.location.pathname);

  return <>{children}</>;
};

const ActionRedirect = () => {
  const { isAuthenticated, getDotYouClient } = useAuth();
  const [searchParams] = useSearchParams();

  const host = getDotYouClient().getRoot();
  if (isAuthenticated && host) {
    console.debug('[AUTHENTICATED]: Redirect to action after login');
    window.location.href = `${host}${searchParams.get('targetPath')}`;

    return null;
  }

  return <></>;
};

export default App;