import { t } from '../../../helpers';
import { CanReactInfo, CantReact } from '../../../hooks';
import { Loader } from '../../../ui';

export const CantReactInfo = ({
  cantReact,
  login,
}: {
  cantReact: CanReactInfo | undefined;
  login?: () => void;
}) => {
  if (cantReact === undefined) {
    return (
      <div className="flex flex-row items-center gap-2 animate-slowding ">
        <Loader className="h-5 w-5 text-foreground" />
        <p>{t('Determining if you can react')}</p>
      </div>
    );
  }

  const details = (cantReact as CantReact)?.details;
  if (details === 'NOT_AUTHENTICATED' && login) {
    return (
      <p className="text-foreground text-sm italic text-opacity-50 flex flex-row items-center gap-2">
        {t('Reactions are disabled for anonymous users')}{' '}
        <button
          onClick={login}
          className="underline underline-offset-2 hover:decoration-2 hover:decoration-primary"
        >
          Login
        </button>
      </p>
    );
  }

  let infoMessage = '';
  // If we can react.. Then it's just partial
  if (cantReact?.canReact === 'emoji' || cantReact?.canReact === 'comment')
    infoMessage = t('You do not have the necessary access to react on this post');
  else
    infoMessage =
      details === 'NOT_AUTHENTICATED'
        ? t('Reactions are disabled for anonymous users')
        : details === 'NOT_AUTHORIZED'
          ? t('You do not have the necessary access to react on this post')
          : details === 'DISABLED_ON_POST'
            ? t('Reactions are disabled on this post')
            : details === 'UNKNOWN'
              ? t("We couldn't determine if you can react on this post")
              : '';

  return <p className="text-foreground text-sm italic text-opacity-50">{infoMessage}</p>;
};
