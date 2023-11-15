import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import Layout from '../components/ui/Layout/Layout';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './App.css';
import { ErrorBoundary } from '../components/ui/Layout/ErrorBoundary/ErrorBoundary';

import DomainChoice from '../templates/Provision/DomainChoice';
import InvitationCodeCheck from '../templates/InvitationCode/InvitationCodeCheck';

const ProvisionManagedDomain = lazy(() => import('../templates/Provision/ProvisionManagedDomain'));
const ProvisionOwnDomain = lazy(() => import('../templates/Provision/ProvisionOwnDomain'));

const queryClient = new QueryClient();
export const ROOT_PATH = '/sign-up';

import { config } from './config';
import { NotFound } from '@youfoundation/common-app';

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
                        <Outlet />
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

export default App;
