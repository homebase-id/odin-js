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
import { Layout, MinimalLayout } from '../components/ui/Layout/Layout';

const YouAuthConsent = lazy(() => import('../templates/YouAuthConsent/YouAuthConsent'));
const Setup = lazy(() => import('../templates/Setup/Setup').then((m) => ({ default: m.Setup })));

const Home = lazy(() => import('../templates/Dashboard/Dashboard'));
const RegisterApp = lazy(() => import('../templates/AppDefinition/RegisterApp'));
const ExtendAppDrivePermissions = lazy(() =>
  import('../templates/AppDefinition/ExtendAppPermissions').then((m) => ({
    default: m.ExtendAppPermissions,
  }))
);
const ExtendCirclePermissionsFromApp = lazy(() =>
  import('../templates/AppDefinition/ExtendCirclePermissionsFromApp').then((m) => ({
    default: m.ExtendCirclePermissionsFromApp,
  }))
);
const UpdateDriveDetailsFromApp = lazy(
  () => import('../templates/AppDefinition/UpdateDriveDetailsFromApp')
);
const Login = lazy(() => import('../templates/Login/Login'));
const AccountRecovery = lazy(() => import('../templates/AccountRecovery/AccountRecovery'));
const FirstRun = lazy(() => import('../templates/FirstRun/FirstRun'));

const Notifications = lazy(() => import('../templates/Notifications/Notifications'));
const NotificationProblems = lazy(() => import('../templates/Notifications/NotificationProblems'));

const Profile = lazy(() => import('../templates/Profiles/Profiles/Profiles'));
const ProfileDetails = lazy(() => import('../templates/Profiles/ProfileDetails/ProfileDetails'));
const Connections = lazy(() => import('../templates/Connections/Connections/Connections'));
const ConnectionDetails = lazy(
  () => import('../templates/Connections/ConnectionDetails/ConnectionDetails')
);
const Domains = lazy(() => import('../templates/Connections/Domains/Domains'));
const DomainDetails = lazy(() => import('../templates/Connections/DomainDetails/DomainDetails'));

const Circles = lazy(() => import('../templates/Circles/Circles/Circles'));
const CircleDetails = lazy(() => import('../templates/Circles/CircleDetails/CircleDetails'));
const Apps = lazy(() => import('../templates/Apps/Apps/Apps'));
const AppDetails = lazy(() => import('../templates/Apps/AppDetails/AppDetails'));

const Website = lazy(() => import('../templates/Website/Website'));
const Following = lazy(() => import('../templates/Follow/Follow'));

const Drives = lazy(() => import('../templates/Drives/Drives/Drives'));
const DriveDetails = lazy(() => import('../templates/Drives/DriveDetails/DriveDetails'));
const FileDetails = lazy(() => import('../templates/Drives/DriveDetails/FileDetails'));
const Settings = lazy(() => import('../templates/Settings/Settings'));

const DemoData = lazy(() => import('../templates/DemoData/DemoData'));
const Debug = lazy(() => import('../templates/Debug/Debug'));

import '@homebase-id/ui-lib/dist/style.css';
import './App.css';
import LoadingDetailPage from '../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import {
  FIRSTRUN_PATH,
  LOGIN_PATH,
  RECOVERY_PATH,
  SETUP_PATH,
  useAuth,
  useValidateAuthorization,
} from '../hooks/auth/useAuth';
import { useIsConfigured } from '../hooks/configure/useIsConfigured';
import {
  DotYouClientProvider,
  ErrorBoundary,
  NotFound,
  OdinQueryClient,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { useInboxProcessor } from '../hooks/inbox/useInboxProcessor';

export const REACT_QUERY_CACHE_KEY = 'OWNER_REACT_QUERY_OFFLINE_CACHE';
const INCLUDED_QUERY_KEYS = ['contact', 'process-inbox'];

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route
          path={FIRSTRUN_PATH}
          element={
            <Suspense fallback={<LoadingDetailPage />}>
              <ErrorBoundary>
                <FirstRun />
              </ErrorBoundary>
            </Suspense>
          }
        />
        <Route
          path={LOGIN_PATH}
          element={
            <Suspense fallback={<LoadingDetailPage />}>
              <ErrorBoundary>
                <Login />
              </ErrorBoundary>
            </Suspense>
          }
        />
        <Route
          path={RECOVERY_PATH}
          element={
            <Suspense fallback={<LoadingDetailPage />}>
              <ErrorBoundary>
                <AccountRecovery />
              </ErrorBoundary>
            </Suspense>
          }
        />

        <Route
          path="/owner"
          element={
            <RootRoute>
              <Suspense>
                <Outlet />
              </Suspense>
            </RootRoute>
          }
        >
          <Route path="youauth/consent" element={<YouAuthConsent />} />

          <Route path="setup" element={<Setup />} />

          <Route
            path=""
            element={
              <MinimalLayout>
                <Suspense fallback={<LoadingDetailPage />}>
                  <ErrorBoundary>
                    <Outlet />
                  </ErrorBoundary>
                </Suspense>
              </MinimalLayout>
            }
          >
            <Route path="appreg" element={<RegisterApp />} />
            <Route path="appupdate" element={<ExtendAppDrivePermissions />} />
            <Route path="apprequest-circles" element={<ExtendCirclePermissionsFromApp />} />
            <Route path="apprequest-drives" element={<UpdateDriveDetailsFromApp />} />
          </Route>

          <Route
            path=""
            element={
              <Layout>
                <Suspense fallback={<LoadingDetailPage />}>
                  <ErrorBoundary>
                    <Outlet />
                  </ErrorBoundary>
                </Suspense>
              </Layout>
            }
          >
            <Route index={true} element={<Home />} />

            <Route path="notifications" element={<Notifications />}></Route>
            <Route path="notifications/problems" element={<NotificationProblems />}></Route>

            <Route path="profile" element={<Profile />}></Route>
            <Route path="profile/homepage" element={<Website />}></Route>
            <Route path="profile/:profileKey" element={<ProfileDetails />}></Route>
            <Route path="profile/:profileKey/:sectionKey" element={<ProfileDetails />}></Route>
            <Route
              path="profile/:profileKey/:sectionKey/:typeKey"
              element={<ProfileDetails />}
            ></Route>
            <Route path="connections" element={<Connections />}></Route>
            <Route path="connections/:odinId" element={<ConnectionDetails />}></Route>
            <Route path="connections/:odinId/about" element={<ConnectionDetails />}></Route>
            <Route path="connections/:odinId/links" element={<ConnectionDetails />}></Route>
            <Route path="connections/:odinId/settings" element={<ConnectionDetails />}></Route>
            <Route
              path="connections/:odinId/settings/:action"
              element={<ConnectionDetails />}
            ></Route>
            <Route path="connections/:odinId/:action" element={<ConnectionDetails />}></Route>
            <Route path="circles" element={<Circles />}></Route>
            <Route path="circles/:circleKey" element={<CircleDetails />}></Route>

            {/* Third parties */}
            <Route path="third-parties/services" element={<Domains />}></Route>
            <Route path="third-parties/services/:domain" element={<DomainDetails />}></Route>
            <Route path="third-parties" element={<Apps />}></Route>
            <Route path="third-parties/apps/" element={<Apps />}></Route>
            <Route path="third-parties/apps/:appKey" element={<AppDetails />}></Route>

            <Route path="follow" element={<Following />}></Route>
            <Route path="follow/followers" element={<Following />}></Route>
            <Route path="follow/followers/:followerKey" element={<Following />}></Route>
            <Route path="follow/following" element={<Following />}></Route>
            <Route path="follow/following/:toFollowKey" element={<Following />}></Route>

            <Route path="drives" element={<Drives />}></Route>
            <Route path="drives/:driveKey" element={<DriveDetails />}></Route>
            <Route path="drives/:driveKey/:fileKey" element={<FileDetails />}></Route>
            <Route
              path="drives/:driveKey/:systemFileType/:fileKey"
              element={<FileDetails />}
            ></Route>
            <Route path="settings" element={<Settings />}></Route>
            <Route path="settings/:sectionId" element={<Settings />}></Route>

            <Route path="demo-data" element={<DemoData />}></Route>
            <Route path="debug" element={<Debug />}></Route>
          </Route>

          <Route
            path="*"
            element={
              <Layout>
                <Suspense fallback={<LoadingDetailPage />}>
                  <NotFound />
                </Suspense>
              </Layout>
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
        cacheKey={REACT_QUERY_CACHE_KEY}
        cachedQueryKeys={INCLUDED_QUERY_KEYS}
        type="local"
      >
        <DotYouClientProvider>
          <RouterProvider router={router} fallbackElement={<></>} />
        </DotYouClientProvider>
      </OdinQueryClient>
    </HelmetProvider>
  );
}

const RootRoute = ({ children }: { children: ReactNode }) => {
  useValidateAuthorization();

  const isAuthenticated = useDotYouClientContext().isAuthenticated();
  const { data: isConfigured, isFetched } = useIsConfigured().isConfigured;
  useInboxProcessor();

  if (!isAuthenticated) {
    if (window.location.pathname === FIRSTRUN_PATH || window.location.pathname === RECOVERY_PATH) {
      return <>{children}</>;
    }

    console.debug('[NOT AUTHENTICATED]: Redirect to login');

    // It can happen that the RootRoute renders when we already are rendering Login, which would cause and endless url of returnUrls; So return early if it is the login already
    if (window.location.pathname === LOGIN_PATH) return <></>;

    return (
      <Navigate
        to={`${LOGIN_PATH}?returnUrl=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`}
      />
    );
  }

  if (
    isAuthenticated &&
    // Check for explicit false, as undefined means we couldn't get the info from the server
    isConfigured === false &&
    isFetched &&
    window.location.pathname !== SETUP_PATH
  ) {
    console.debug('[NOT CONFIGURED]: Redirect to configure');
    return (
      <Navigate
        to={`${SETUP_PATH}?returnUrl=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`}
      />
    );
  }

  return <>{children}</>;
};

export default App;
