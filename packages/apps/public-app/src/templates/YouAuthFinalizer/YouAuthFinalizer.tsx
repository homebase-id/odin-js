import { useEffect } from 'react';
import { useYouAuthAuthorization } from '../../hooks/auth/useAuth';
import { t } from '@homebase-id/common-app';
import { tryJsonParse } from '@homebase-id/js-lib/helpers';

/**
 * The identity server redirects here with either the sign-in result, or an `error` code when the
 * exchange with the other identity did not complete.
 *
 * It previously rendered the bare string "ERROR!" for anything unexpected, including the `error`
 * case -- so every failure, whatever its cause, looked identical and looked terminal. The codes are
 * read now: `remoteIdentityUpgrading` in particular means the sign-in is fine and will work
 * shortly, which is the opposite of what "ERROR!" conveys.
 */
const ERROR_MESSAGES: Record<string, string> = {
  remoteIdentityUpgrading: t(
    'That identity is finishing an update. Wait a few seconds and sign in again.'
  ),
  remoteValidationCallFailed: t('We could not reach that identity to finish signing in.'),
  'cancelled-by-user': t('Sign-in was cancelled.'),
  'unknown-check-server-logs': t('Something went wrong signing in.'),
};

const SignInProblem = ({ code }: { code: string }) => (
  <section className="flex min-h-screen flex-col justify-center">
    <div className="container mx-auto max-w-lg p-5">
      <p className="mb-2 text-lg">
        {ERROR_MESSAGES[code] ?? t('Something went wrong signing in.')}
      </p>
      {/* The raw code is kept visible: it is the only thing that makes a support conversation
          about a failed sign-in tractable, and it is not sensitive. */}
      <p className="text-sm text-slate-400">
        {t('Error')}: <span className="font-mono">{code}</span>
      </p>
    </div>
  </section>
);

const YouAuthFinalizer = () => {
  const { finalizeAuthorization } = useYouAuthAuthorization();

  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  const result = urlParams.get('r');
  const eccInfo = urlParams.get('ecc');

  const parsed = eccInfo
    ? tryJsonParse<{ pk: string; salt: string; iv: string }>(eccInfo)
    : undefined;

  const canFinalize = !error && !!result && !!parsed?.pk && !!parsed?.salt && !!parsed?.iv;

  // Unconditional, because hooks cannot be called behind a branch -- the early returns that used to
  // sit above this one meant the effect below was ordered differently depending on the URL.
  useEffect(() => {
    if (!canFinalize) return;
    finalizeAuthorization(result as string, parsed!.pk, parsed!.salt, parsed!.iv);
  }, [canFinalize]);

  if (error) return <SignInProblem code={error} />;

  // No error named, but nothing usable either: still a failure, and still worth saying so rather
  // than showing a blank page.
  if (!canFinalize) return <SignInProblem code="incomplete-response" />;

  return <></>;
};

export default YouAuthFinalizer;
