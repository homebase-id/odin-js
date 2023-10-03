import { ReactNode, useState } from 'react';
import { Times, t } from '@youfoundation/common-app';
import useSettings from '../../../hooks/settings/useSettings';
import { ErrorNotification } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DomainHighlighter } from '@youfoundation/common-app';
import IncomingConnectionDialog from '../../Dialog/ConnectionDialogs/IncomingConnectionDialog';
import PersonCard from '../PersonCard/PersonCard';
import usePendingConnection from '../../../hooks/connections/usePendingConnection';

const PersonIncomingRequest = ({
  senderOdinId,
  children,
  className,
}: {
  senderOdinId: string;
  children?: ReactNode;
  className: string;
}) => {
  const {
    ignoreRequest: { mutateAsync: ignoreRequest, status: ignoreRequestStatus, error: ignoreError },
  } = usePendingConnection({});
  const { data: uiSettings } = useSettings().fetchUiSettings;
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);

  return (
    <>
      <ErrorNotification error={ignoreError} />
      <PersonCard
        className={className}
        odinId={senderOdinId}
        key={senderOdinId}
        canSave={!!uiSettings?.automaticallyLoadProfilePicture}
      >
        <h2 className="font-thiner mb-6 dark:text-white">
          <DomainHighlighter>{senderOdinId}</DomainHighlighter>
        </h2>
        {children}
        <ActionButton
          type="primary"
          className="mb-2 w-full"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsAcceptDialogOpen(true);
            return false;
          }}
        >
          {t('Confirm request')}...
        </ActionButton>
        <ActionButton
          type="secondary"
          className="mb-2 w-full"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await ignoreRequest({ senderOdinId: senderOdinId });

            return false;
          }}
          confirmOptions={{
            type: 'info',
            title: t('Ignore request'),
            body: `${t('Are you sure you want to ignore the request from')} ${senderOdinId}`,
            buttonText: t('Ignore'),
          }}
          state={ignoreRequestStatus}
          icon={Times}
        >
          {t('Ignore request')}
        </ActionButton>
      </PersonCard>
      <IncomingConnectionDialog
        isOpen={isAcceptDialogOpen}
        senderOdinId={senderOdinId}
        confirmText={t('Connect')}
        onConfirm={async () => {
          setIsAcceptDialogOpen(false);
        }}
        onCancel={() => {
          setIsAcceptDialogOpen(false);
        }}
      />
    </>
  );
};

export default PersonIncomingRequest;
