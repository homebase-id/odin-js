import { ActionButton, DomainHighlighter, t } from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';

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
 * refused (odin-core #2039), since it would replace the keys its devices hold.
 */
export const AlreadyInstalled = ({
  name,
  origin,
  doContinue,
  doCancel,
}: {
  name: string;
  origin: string | undefined;
  doContinue: () => void;
  doCancel: () => void;
}) => (
  <section className="my-20">
    <div className="container mx-auto">
      <div className="max-w-[35rem]">
        <h1 className="mb-5 text-4xl dark:text-white">
          {t('Already installed')}:
          <AppName name={name} origin={origin} />
        </h1>
        <p className="mb-5">
          {t(
            'This app is already installed. Its permissions are changed from its own page under Apps.'
          )}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <ActionButton type="primary" onClick={doContinue} icon={Arrow}>
            {t('Continue')}
          </ActionButton>
          <ActionButton type="secondary" onClick={doCancel}>
            {t('Cancel')}
          </ActionButton>
        </div>
      </div>
    </div>
  </section>
);
