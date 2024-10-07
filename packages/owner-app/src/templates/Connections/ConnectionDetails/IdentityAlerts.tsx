import {
  ErrorNotification,
  Alert,
  t,
  DomainHighlighter,
  ActionButton,
} from '@homebase-id/common-app';
import { Times } from '@homebase-id/common-app/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnection } from '../../../hooks/connections/useConnection';
import { useFocusedEditing } from '../../../hooks/focusedEditing/useFocusedEditing';
import { usePendingConnection } from '../../../hooks/connections/usePendingConnection';
import IncomingConnectionDialog from '../../../components/Connection/ConnectionDialogs/IncomingConnectionDialog';
import { useAutoConnection } from '../../../hooks/connections/useAutoConnection';

export const IdentityAlerts = ({ odinId }: { odinId: string | undefined }) => {
  const navigate = useNavigate();

  const {
    fetch: { data: connectionInfo, isLoading: connectionInfoLoading },
  } = useConnection({ odinId: odinId });
  const {
    ignoreRequest: { mutateAsync: ignoreRequest, status: ignoreRequestStatus, error: ignoreError },
  } = usePendingConnection({ odinId: odinId });
  const {
    isUnconfirmedAutoConnected: { data: isUnconfirmedAutoConnection },
    confirmAutoConnection: {
      mutate: confirmIntroduction,
      error: confirmIntroductionError,
      status: confirmIntroductionState,
    },
  } = useAutoConnection({ odinId: odinId });

  const checkReturnTo = useFocusedEditing();
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);

  if (connectionInfoLoading || !odinId) return null;

  return (
    <>
      <ErrorNotification error={ignoreError || confirmIntroductionError} />

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

      {isUnconfirmedAutoConnection && confirmIntroductionState !== 'success' ? (
        <Alert type="info" className="bg-background">
          <div className="flex flex-col justify-between gap-2 lg:flex-row">
            <p>
              {t('You were automatically connected to')} &quot;
              <DomainHighlighter>{odinId}</DomainHighlighter>&quot;{' '}
              {t('because of an introduction by')} &quot;{connectionInfo?.introducerOdinId}
              &quot;
              <br />
              {t('Would you like to confirm this connection?')}
            </p>

            <ActionButton
              type="primary"
              onClick={() => confirmIntroduction(odinId)}
              state={confirmIntroductionState}
              confirmOptions={{
                title: t('Confirm connection'),
                body: t(
                  'Are you sure you want to confirm this connection? This action cannot be undone.'
                ),
                buttonText: t('Confirm'),
                type: 'info',
              }}
              className="ml-auto"
            >
              {t('Confirm connection')}
            </ActionButton>
            {/* <div className="my-auto ml-auto grid grid-flow-col gap-2">
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
              </div> */}
          </div>
        </Alert>
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
