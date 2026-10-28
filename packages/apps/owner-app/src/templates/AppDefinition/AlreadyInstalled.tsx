import { Link } from 'react-router-dom';
import { ActionButton, DomainHighlighter, t } from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';
import { RedactedAppRegistration } from '../../provider/app/AppManagementProviderTypes';

/** The app's name under a page heading, with the origin it asked from. */
export const AppName = ({ name, origin }: { name: string; origin: string | undefined }) => (
  <small className="block">
    {name}{' '}
    {origin ? (
      <>
        (<DomainHighlighter>{origin}</DomainHighlighter>)
      </>
    ) : (
      ''
    )}
  </small>
);

/**
 * Shown instead of the install prompt when the app is already installed: registering it again is
 * refused (odin-core #2039), since it would replace the keys its devices hold. It names the app as
 * installed, not as the link describes it, and offers to go back only when signing in can work.
 */
export const AlreadyInstalled = ({
  app,
  requestedSlug,
  doContinue,
  doCancel,
}: {
  app: RedactedAppRegistration;
  requestedSlug: string;
  doContinue: () => void;
  doCancel: () => void;
}) => {
  // Sign-in finds the app by the slug it asks for: under another slug it is sent back here
  const otherSlug = !!app.appSlug && app.appSlug.toLowerCase() !== requestedSlug.toLowerCase();
  const canContinue = !app.isRevoked && !otherSlug;

  return (
    <section className="my-20">
      <div className="container mx-auto">
        <div className="max-w-[35rem]">
          <h1 className="mb-5 text-4xl dark:text-white">
            {t('Already installed')}:
            <AppName name={app.name} origin={app.corsHostName} />
          </h1>
          <p className="mb-5">
            {app.isRevoked
              ? t('This app is installed but revoked. Allow it again from its page under Apps.')
              : otherSlug
                ? `${t('This app is installed as')} "${app.appSlug}", ${t('but asks to sign in as')} "${requestedSlug}". ${t('It cannot sign in until its developer fixes that.')}`
                : t(
                    'This app is already installed. Its permissions are changed from its page under Apps.'
                  )}{' '}
            <Link className="underline" to={`/owner/apps/${encodeURIComponent(app.appId)}`}>
              {t('Open its page')}
            </Link>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            {canContinue ? (
              <ActionButton type="primary" onClick={doContinue} icon={Arrow}>
                {t('Continue')}
              </ActionButton>
            ) : null}
            <ActionButton type="secondary" onClick={doCancel}>
              {t('Cancel')}
            </ActionButton>
          </div>
        </div>
      </div>
    </section>
  );
};
