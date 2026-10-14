import { ActionButton, getCancelRedirectUrl, getStateParam, t } from '@homebase-id/common-app';

/**
 * Shown instead of a permission prompt when the link an app sent is unusable: a required parameter
 * is missing or malformed. The owner cannot fix that -- the app built the link -- so the page says
 * so, names the app to tell, lists exactly what is wrong for the developer, and offers a way back.
 */
export const InvalidAppRequest = ({
  appName,
  origin,
  problems,
  cancelUrl,
  returnUrl,
}: {
  appName?: string | null;
  origin?: string | null;
  problems: string[];
  cancelUrl?: string | null;
  returnUrl?: string | null;
}) => {
  const app = appName || t('This app');

  // Back to the app the way a decline goes back -- with error=cancelled-by-user -- when it gave a
  // cancel URL; otherwise to wherever it asked to return; otherwise home.
  const backUrl = cancelUrl
    ? getCancelRedirectUrl(cancelUrl, getStateParam(returnUrl))
    : returnUrl || '/owner';

  return (
    <section className="my-20">
      <div className="container mx-auto">
        <div className="max-w-[35rem]">
          <h1 className="mb-5 text-4xl dark:text-white">
            {t('This request can not be completed')}
          </h1>

          <p className="mb-4">
            {app}
            {origin ? <span className="text-slate-400"> ({origin})</span> : null}{' '}
            {t(
              'sent a request your identity can not accept. This is not something you can fix: the app needs to be updated. Please let its developer know.'
            )}
          </p>

          {problems.length ? (
            <div className="mb-6 rounded-md bg-slate-100 p-4 text-sm dark:bg-slate-800">
              <p className="mb-2 font-semibold">{t('For the developer')}:</p>
              <ul className="list-disc pl-5">
                {problems.map((problem) => (
                  <li key={problem} className="break-words font-mono">
                    {problem}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-slate-500">
                {t(
                  'Slugs (as, ds, ts) must be lowercase letters, digits and hyphens, 1-14 characters, not starting or ending with a hyphen.'
                )}
              </p>
            </div>
          ) : null}

          <ActionButton type="secondary" onClick={() => (window.location.href = backUrl)}>
            {t('Back to the app')}
          </ActionButton>
        </div>
      </div>
    </section>
  );
};
