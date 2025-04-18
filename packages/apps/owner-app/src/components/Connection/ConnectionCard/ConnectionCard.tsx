import { ContactName } from '@homebase-id/common-app';
import { t, useAutoConnection, useDetailedConnectionInfo } from '@homebase-id/common-app';
import PersonCard, { PersonCardProps } from '../PersonCard/PersonCard';
import { Question } from '@homebase-id/common-app/icons';

const ConnectionCard = (props: PersonCardProps) => {
  const fullName = ContactName({ odinId: props.odinId, canSave: props.canSave });

  const {
    isUnconfirmedAutoConnected: { data: isUnconfirmedAutoConnection },
  } = useAutoConnection({ odinId: props.odinId });

  const { data: connectionInfo } = useDetailedConnectionInfo({
    odinId: isUnconfirmedAutoConnection ? props.odinId : undefined,
  }).fetch;

  return (
    <>
      <PersonCard {...props}>
        <h2 className="font-thiner flex flex-col dark:text-white">
          <span className="break-words group-hover:underline">{fullName ?? props.odinId}</span>
          {fullName ? (
            <small
              className={`d-block relative overflow-hidden text-nowrap break-words text-sm text-slate-500 after:absolute after:inset-0 after:left-auto after:w-4 after:bg-gradient-to-l after:from-background after:to-transparent after:content-[''] dark:text-slate-400`}
            >
              {props.odinId}
            </small>
          ) : (
            ''
          )}
          {isUnconfirmedAutoConnection && connectionInfo?.introducerOdinId ? (
            <p className="text-sm text-slate-400">
              {t('Introduced by')} {connectionInfo.introducerOdinId}
            </p>
          ) : null}
        </h2>
        {props.children}
        {isUnconfirmedAutoConnection ? (
          <div
            className="absolute left-3 top-3 rounded-full bg-background p-[0.2rem] text-blue-400"
            title={t('Unconfirmed connection')}
          >
            <Question className="h-5 w-5" />
          </div>
        ) : null}
      </PersonCard>
    </>
  );
};

export default ConnectionCard;
