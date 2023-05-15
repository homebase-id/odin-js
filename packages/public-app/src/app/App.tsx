import { lazy, ReactNode, Suspense } from 'react';
import {
  Route,
  Outlet,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  useSearchParams,
} from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import Layout from '../components/ui/Layout/Layout';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './App.css';
import { ErrorBoundary } from '../components/ui/Layout/ErrorBoundary/ErrorBoundary';
import useAuth from '../hooks/auth/useAuth';
import Header from '../components/ui/Layout/Header/Header';
import Footer from '../components/ui/Layout/Footer/Footer';

import { t, useSiteData } from '@youfoundation/common-app';

const RootRoute = lazy(() => import('./RootRoute'));

const NotFound = lazy(() => import('../templates/NotFound/NotFound'));
const Home = lazy(() => import('../templates/Home/Home'));
const PostOverview = lazy(() => import('../templates/Posts/Overview/PostOverview'));
const PostDetail = lazy(() => import('../templates/Posts/Detail/PostDetail'));
const PostImageDetail = lazy(() => import('../templates/Posts/Detail/PostImageDetail'));
const LinksPage = lazy(() => import('../templates/LinksPage/LinksPage'));
const YouAuthFinalizer = lazy(() => import('../templates/YouAuthFinalizer/YouAuthFinalizer'));

const Ping = lazy(() => import('../templates/Ping/Ping'));

const queryClient = new QueryClient();

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route
          path="/home"
          element={
            <Layout>
              <ErrorBoundary>
                <Suspense fallback={<></>}>
                  <Outlet />
                </Suspense>
              </ErrorBoundary>
            </Layout>
          }
        >
          <Route path="action" element={<ActionRedirect />} />
          <Route path="youauth/finalize" element={<YouAuthFinalizer />} />
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
            <Route path="about" element={<Home tab="about" />} />
            <Route path="links" element={<Home tab="links" />} />
            <Route path="posts" element={<Home tab="posts" />} />
            <Route path="connections" element={<Home tab="connections" />} />

            <Route path="posts/:channelKey" element={<PostOverview />} />
            <Route path="posts/:channelKey/:postKey" element={<PostDetail />} />
            <Route path="posts/:channelKey/:postKey/:attachmentKey" element={<PostImageDetail />} />

            <Route path="linked" element={<LinksPage />} />
            <Route path="ping" element={<Ping />} />
            <Route path="*" element={<NotFound />} />
          </Route>
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

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isOwner } = useAuth();
  const { data: siteData, isFetched: siteDataFetched } = useSiteData();

  if (
    siteData &&
    siteDataFetched &&
    (siteData.home?.template === '0' || !siteData.home?.template)
  ) {
    return (
      <div className="flex min-h-screen">
        <span className="m-auto text-center">
          {t('This is a registered dotyou identity')}
          {isOwner ? (
            <small className="block">
              {t('Select a website theme and make yourself known on the internet!')}{' '}
              <a href="/owner/profile/homepage" className="underline">
                {t('Start')}!
              </a>
            </small>
          ) : null}
        </span>
      </div>
    );
  }

  return <>{children}</>;
};

const ActionRedirect = () => {
  const { isAuthenticated, getIdentity } = useAuth();
  const [searchParams] = useSearchParams();

  const identity = getIdentity();
  console.log(identity);
  if (isAuthenticated && identity) {
    console.debug('[AUTHENTICATED]: Redirect to action after login');

    window.location.href = `https://${identity}${searchParams.get('targetPath')}`;

    return null;
  }

  return <></>;
};

export default App;
