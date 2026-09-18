import { useState } from 'react';
import { t, useDotYouClientContext } from '@homebase-id/common-app';
import ProfileNav from '../../components/Auth/ProfileNav/ProfileNav';
import LoginDialog from '../../components/Dialog/LoginDialog/LoginDialog';
import { CARD_FOCUS } from '../CardDesign';

// The desktop pages' account control; each layout styles the button
export const CardSignIn = ({ className }: { className: string }) => {
  const client = useDotYouClientContext();
  const [isOpen, setIsOpen] = useState(false);

  if (client.isOwner()) return null; // the owner has the Sidenav
  if (client.isAuthenticated())
    return (
      // ProfileNav is app chrome with its own panel, so it takes the app's text colour
      <div className="text-foreground">
        <ProfileNav />
      </div>
    );

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        className={`${className} ${CARD_FOCUS}`}
      >
        {t('Sign in')}
      </button>
      <LoginDialog
        title={t('Sign in')}
        isOpen={isOpen}
        onCancel={() => setIsOpen(false)}
        returnPath={window.location.pathname}
      />
    </>
  );
};
