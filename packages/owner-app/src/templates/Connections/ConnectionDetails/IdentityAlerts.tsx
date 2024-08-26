import {
  ErrorNotification,
  Alert,
  t,
  DomainHighlighter,
  ActionButton,
} from '@youfoundation/common-app';
import { Times } from '@youfoundation/common-app/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnection } from '../../../hooks/connections/useConnection';
import { useFocusedEditing } from '../../../hooks/focusedEditing/useFocusedEditing';
import { usePendingConnection } from '../../../hooks/connections/usePendingConnection';
import IncomingConnectionDialog from '../../../components/Connection/ConnectionDialogs/IncomingConnectionDialog';

export const IdentityAlerts = ({ odinId }: { odinId: string | undefined }) => {
  const navigate = useNavigate();

  const {
    fetch: { data: connectionInfo, isLoading: connectionInfoLoading },
  } = useConnection({ odinId: odinId });
  const {
    ignoreRequest: { mutateAsync: ignoreRequest, status: ignoreRequestStatus, error: ignoreError },
  } = usePendingConnection({ odinId: odinId });

  const checkReturnTo = useFocusedEditing();
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);

  if (connectionInfoLoading) return null;

  return (
    <>
      <ErrorNotification error={ignoreError} />

      {connectionInfo?.status === 'blocked' ? (
        <>
          <Alert type="critical">{t('This person is currently blocked')}</Alert>
        </>
      ) : null}

      {connectionInfo?.status === 'pending' ? (
        <>
          <Alert type="info" className="bg-background">
            <div className="flex flex-grow flex-col gap-2 sm:flex-row">
              <div className="mr-1">
                <p>
                  &quot;<DomainHighlighter>{connectionInfo?.senderOdinId}</DomainHighlighter>&quot;{' '}
                  {t('sent you a connection request')}:
                </p>
                <p className="text-sm text-gray-600">{connectionInfo?.message}</p>
              </div>
              <div className="my-auto ml-auto grid grid-flow-col gap-2">
                <ActionButton
                  type="primary"
                  onClick={() => {
                    setIsAcceptDialogOpen(true);
                  }}
                >
                  {t('View request')}...
                </ActionButton>
                <ActionButton
                  type="secondary"
                  onClick={async () => {
                    await ignoreRequest(
                      { senderOdinId: connectionInfo.senderOdinId },
                      { onSuccess: () => navigate('/owner/connections') }
                    );
                    checkReturnTo('Ignored');
                  }}
                  state={ignoreRequestStatus}
                  icon={Times}
                >
                  {t('Ignore request')}
                </ActionButton>
              </div>
            </div>
          </Alert>
          <IncomingConnectionDialog
            isOpen={isAcceptDialogOpen}
            senderOdinId={connectionInfo.senderOdinId}
            confirmText={t('Connect')}
            onConfirm={() => {
              setIsAcceptDialogOpen(false);
            }}
            onCancel={() => {
              setIsAcceptDialogOpen(false);
            }}
          />
        </>
      ) : null}

      <LimboStateAlert odinId={odinId} />
    </>
  );
};

const LimboStateAlert = ({ odinId }: { odinId: string | undefined }) => {
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);

  const {
    fetch: { data: connectionInfo, isLoading: connectionInfoLoading },
  } = useConnection({ odinId: odinId });

  const {
    fetch: { data: pendingConnection, isLoading: pendingConnectionLoading },
    ignoreRequest: { mutate: ignoreRequest, status: ignoreRequestStatus, error: ignoreError },
  } = usePendingConnection({
    odinId: connectionInfo?.status === 'connected' ? odinId : undefined,
  });

  if (
    connectionInfoLoading ||
    !connectionInfo ||
    connectionInfo.status !== 'connected' ||
    pendingConnectionLoading ||
    !pendingConnection
  )
    return null;

  return (
    <>
      <ErrorNotification error={ignoreError} />
      <Alert type="warning" className="">
        <div className="flex flex-grow flex-col gap-2">
          <p>
            &quot;<DomainHighlighter>{pendingConnection?.senderOdinId}</DomainHighlighter>&quot;{' '}
            {t('sent you a connection request, but you are already connected')}:
            <small className="block text-sm">
              {t('Confirming this request will reset your connection keys')}
            </small>
          </p>
          <p className="text-sm text-gray-600">{pendingConnection?.message}</p>

          <div className="my-auto ml-auto grid grid-flow-col gap-2">
            <ActionButton
              type="primary"
              onClick={() => {
                setIsAcceptDialogOpen(true);
              }}
            >
              {t('View request')}...
            </ActionButton>
            <ActionButton
              type="secondary"
              onClick={() => ignoreRequest({ senderOdinId: pendingConnection.senderOdinId })}
              state={ignoreRequestStatus}
              icon={Times}
            >
              {t('Ignore request')}
            </ActionButton>
          </div>
        </div>
      </Alert>
      <IncomingConnectionDialog
        isOpen={isAcceptDialogOpen}
        senderOdinId={pendingConnection.senderOdinId}
        confirmText={t('Connect')}
        onConfirm={() => setIsAcceptDialogOpen(false)}
        onCancel={() => setIsAcceptDialogOpen(false)}
      />
    </>
  );
};
