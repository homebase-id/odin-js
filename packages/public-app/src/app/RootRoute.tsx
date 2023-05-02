import { ReactNode } from 'react';
import Toaster from '../components/Toaster/Toaster';
import useAuth from '../hooks/auth/useAuth';
import { useTransitProcessor } from '@youfoundation/common-app';

const RootRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isOwner } = useAuth();
  useTransitProcessor();

  if (!isAuthenticated || !isOwner) {
    console.debug('[NOT AUTHENTICATED]: Redirect to owner login');

    window.location.href = `https://${
      window.location.hostname
    }/owner/login/youauth?returnUrl=${encodeURIComponent(window.location.href)}`;

    return null;
  }

  return (
    <>
      {children}
      <Toaster />
    </>
  );
};

export default RootRoute;
