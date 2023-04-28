import { DotYouProfile } from '@youfoundation/js-lib';
import { t } from '../../../helpers/i18n/dictionary';
import useConnection from '../../../hooks/connections/useConnection';
import { ErrorNotification } from '@youfoundation/common-app';
import ActionButton from '../../ui/Buttons/ActionButton';
import ConnectionCard from '../ConnectionCard/ConnectionCard';

const PersonActive = ({
  dotYouProfile,

  className,
}: {
  dotYouProfile: DotYouProfile;
  className: string;
}) => {
  const {
    mutate: disconnect,
    status: disconnectStatus,
    error: actionError,
  } = useConnection({}).disconnect;

  return (
    <>
      <ErrorNotification error={actionError} />
      <ConnectionCard
        className={`${className ?? ''} relative`}
        odinId={dotYouProfile.odinId}
        href={(dotYouProfile.odinId && `/owner/connections/${dotYouProfile.odinId}`) ?? undefined}
      >
        <div className="absolute right-2 top-2 z-10 aspect-square rounded-full">
          <ActionButton
            type="secondary"
            className="rounded-full"
            onClick={(e) => {
              e.preventDefault();
              disconnect({ connectionOdinId: dotYouProfile.odinId });
            }}
            state={disconnectStatus}
            confirmOptions={{
              title: `${t('Remove')} ${dotYouProfile.odinId}`,
              buttonText: t('Remove'),
              body: `${t('Are you sure you want to remove')} ${dotYouProfile.odinId} ${t(
                'from your connections. They will lose all existing access.'
              )}`,
            }}
            icon="times"
            size="square"
          />
        </div>
      </ConnectionCard>
    </>
  );
};

export default PersonActive;
