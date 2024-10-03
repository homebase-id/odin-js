import { t } from '../../../helpers';
import { CanReactInfo, CantReact } from '../../../hooks';
import { Loader } from '../../../ui/Icons';

export const CantReactInfo = ({
  cantReact,
  login,
  intent,
}: {
  cantReact: CanReactInfo | undefined;
  login?: () => void;
  intent: 'emoji' | 'comment';
}) => {
  const copy = {
    determining:
      intent === 'comment' ? 'Determining if you can comment' : 'Determining if you can react',
    anonymous:
      intent === 'comment'
        ? 'Comments are disabled for anonymous users'
        : 'Reactions are disabled for anonymous users',
    'missing-access':
      intent === 'comment'
        ? 'You do not have the necessary access to comment on this post'
        : 'You do not have the necessary access to react on this post',
    disabled:
      intent === 'comment'
        ? 'Comments are disabled on this post'
        : 'Reactions are disabled on this post',
    impossible:
      intent === 'comment'
        ? "We couldn't determine if you can comment on this post"
        : "We couldn't determine if you can react on this post",
  };

  if (cantReact === undefined) {
    return (
      <div className="flex flex-row items-center gap-2 animate-slowding ">
        <Loader className="h-5 w-5 text-foreground" />
        <p>{t(copy.determining)}</p>
      </div>
    );
  }

  const details = (cantReact as CantReact)?.details;
  if (details === 'NOT_AUTHENTICATED' && login) {
    return (
      <p className="text-foreground text-sm italic text-opacity-50 flex flex-row items-center gap-2">
        {t(copy.anonymous)}{' '}
        <button
          onClick={login}
          className="underline underline-offset-2 hover:decoration-2 hover:decoration-primary"
        >
          {t('Login')}
        </button>
      </p>
    );
  }

  let infoMessage = '';
  // If we can react.. Then it's just partial
  if (cantReact?.canReact === 'emoji' || cantReact?.canReact === 'comment')
    infoMessage = t(copy['missing-access']);
  else
    infoMessage =
      details === 'NOT_AUTHENTICATED'
        ? t(copy.anonymous)
        : details === 'NOT_AUTHORIZED'
          ? t(copy['missing-access'])
          : details === 'DISABLED_ON_POST'
            ? t(copy.disabled)
            : details === 'UNKNOWN'
              ? t(copy.impossible)
              : '';

  return <p className="text-foreground text-sm italic text-opacity-50">{infoMessage}</p>;
};
