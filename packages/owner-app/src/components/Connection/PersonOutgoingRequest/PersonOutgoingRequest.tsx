import { Times, t } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DomainHighlighter } from '@youfoundation/common-app';
import PersonCard from '../PersonCard/PersonCard';
import { useConnectionActions } from '../../../hooks/connections/useConnectionActions';

const PersonOutgoingRequest = ({
  recipientOdinId,
  className,
}: {
  recipientOdinId: string;
  className: string;
}) => {
  const {
    mutate: revokeRequest,
    status: revokeRequestStatus,
    error: actionError,
  } = useConnectionActions().revokeConnectionRequest;

  return (
    <>
      <ErrorNotification error={actionError} />
      <PersonCard
        className={className}
        odinId={recipientOdinId}
        href={(recipientOdinId && `/owner/connections/${recipientOdinId}`) ?? undefined}
      >
        <h2 className="font-thiner mb-6 dark:text-white">
          <DomainHighlighter>{recipientOdinId}</DomainHighlighter>
        </h2>
        <ActionButton
          type="secondary"
          className="mb-2 w-full"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            revokeRequest({ targetOdinId: recipientOdinId });
            return false;
          }}
          state={revokeRequestStatus}
          icon={Times}
        >
          {t('Cancel')}
        </ActionButton>
      </PersonCard>
    </>
  );
};

export default PersonOutgoingRequest;
