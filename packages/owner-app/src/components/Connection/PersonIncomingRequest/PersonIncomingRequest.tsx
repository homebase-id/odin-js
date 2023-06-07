import { ReactNode, useState } from 'react';
import { Check, Times, t } from '@youfoundation/common-app';
import useConnection from '../../../hooks/connections/useConnection';
import useSettings from '../../../hooks/settings/useSettings';
import { ErrorNotification } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DomainHighlighter } from '@youfoundation/common-app';
import IncomingConnectionDialog from '../../Dialog/ConnectionDialogs/IncomingConnectionDialog';
import PersonCard from '../PersonCard/PersonCard';
import { ConnectionRequest } from '@youfoundation/js-lib/network';

const PersonIncomingRequest = ({
  senderOdinId,
  pendingConnection,
  children,
  className,
}: {
  senderOdinId: string;
  pendingConnection: ConnectionRequest;
  children?: ReactNode;
  className: string;
}) => {
  const {
    ignoreRequest: { mutateAsync: ignoreRequest, status: ignoreRequestStatus, error: ignoreError },
  } = useConnection({});
  const { data: uiSettings } = useSettings().fetchUiSettings;
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);

  return (
    <>
      <ErrorNotification error={ignoreError} />
      <PersonCard
        className={className}
        odinId={senderOdinId}
        key={senderOdinId}
        onlyLoadAfterClick={!uiSettings?.automaticallyLoadProfilePicture}
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
            setIsAcceptDialogOpen(true);
            return false;
          }}
          icon={Check}
        >
          {t('Confirm request')}...
        </ActionButton>
        <ActionButton
          type="secondary"
          className="mb-2 w-full"
          onClick={async (e) => {
            e.preventDefault();
            await ignoreRequest({ senderOdinId: senderOdinId });

            return false;
          }}
          confirmOptions={{
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
        pendingConnection={pendingConnection}
      />
    </>
  );
};

export default PersonIncomingRequest;
