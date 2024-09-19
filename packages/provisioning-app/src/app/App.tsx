import { lazy, ReactNode, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
  useNavigation,
  useMatch,
} from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Layout } from '../components/ui/Layout/Layout';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './App.css';

import DomainChoice from '../templates/Provision/DomainChoice';
import InvitationCodeCheck from '../templates/InvitationCode/InvitationCodeCheck';

const ProvisionManagedDomain = lazy(() => import('../templates/Provision/ProvisionManagedDomain'));
const ProvisionOwnDomain = lazy(() => import('../templates/Provision/ProvisionOwnDomain'));

const queryClient = new QueryClient();
export const ROOT_PATH = '/sign-up';

import { config } from './config';
import { ErrorBoundary, NotFound } from '@homebase-id/common-app';
import { useConfiguration } from '../hooks/configuration/useConfiguration';
import { Loader } from '@homebase-id/common-app/icons';

function App() {
  return (
    <HelmetProvider>
      <Helmet>
        <meta name="v" content={import.meta.env.VITE_VERSION} />
        <meta name="description" content={`${config.brandName} - ${config.brandSlogan} `} />
        <title>Signup | {config.brandName}</title>
      </Helmet>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={<Layout />}>
            <Routes>
              <Route
                path=""
                element={
                  <Layout>
                    <Suspense>
                      <ErrorBoundary>
                        <RootRoute>
                          <Outlet />
                        </RootRoute>
                      </ErrorBoundary>
                    </Suspense>
                  </Layout>
                }
              >
                <Route path="/" element={<InvitationCodeCheck />}></Route>
                <Route path={ROOT_PATH}>
                  <Route index={true} element={<DomainChoice />} />
                  <Route path="managed-domain" element={<ProvisionManagedDomain />} />
                  <Route path="own-domain" element={<ProvisionOwnDomain />} />
                  <Route
                    path="*"
                    element={
                      <Layout>
                        <NotFound />
                      </Layout>
                    }
                  />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </Router>
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const RootRoute = ({ children }: { children: ReactNode }) => {
  const { data: configuration, isLoading } = useConfiguration();
  const isRoot = useMatch('/');

  if (isLoading)
    return (
      <div className="flex flex-grow flex-col">
        <Loader className="m-auto h-20 w-20" />
      </div>
    );

  if (!configuration?.invitationCodeEnabled && !!isRoot) {
    return <Navigate to={ROOT_PATH} />;
  }

  return <>{children}</>;
};

export default App;
