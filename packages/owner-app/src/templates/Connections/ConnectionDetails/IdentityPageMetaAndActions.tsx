import {
  ActionButton,
  t,
  ActionGroupOptionProps,
  House,
  Trash,
  Block,
  ErrorNotification,
  Persons,
  ActionGroup,
  useDotYouClient,
  ConfirmDialog,
  Ellipsis,
  useIdentityIFollow,
} from '@youfoundation/common-app';
import { useNavigate, useParams } from 'react-router-dom';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';
import { useConnection } from '../../../hooks/connections/useConnection';
import { useContact } from '../../../hooks/contacts/useContact';
import { useEffect, useState } from 'react';
import OutgoingConnectionDialog from '../../../components/Dialog/ConnectionDialogs/OutgoingConnectionDialog';
import { useConnectionActions } from '../../../hooks/connections/useConnectionActions';

export const IdentityPageMetaAndActions = ({
  odinId, // setIsEditPermissionActive,
}: {
  odinId: string;
  // setIsEditPermissionActive: (newState: boolean) => void;
}) => {
  const navigate = useNavigate();
  const { action } = useParams();
  const [isSentConnectionOpen, setIsSentConnectionOpen] = useState(action === 'connect');
  const [isBlockConfirmationOpen, setIsBlockConfirmationOpen] = useState(action === 'block');
  const { getIdentity } = useDotYouClient();

  useEffect(() => {
    if (action === 'connect' && !isSentConnectionOpen) {
      const paths = window.location.pathname.split('/');
      paths.pop();
      navigate(paths.join('/'));
    } else if (action !== 'connect' && isSentConnectionOpen)
      navigate(`${window.location.pathname}/connect`);
  }, [isSentConnectionOpen]);

  useEffect(() => {
    if (!isBlockConfirmationOpen && action === 'block') {
      const paths = window.location.pathname.split('/');
      paths.pop();
      navigate(paths.join('/'));
    }
  }, [isBlockConfirmationOpen]);

  // Connection data:
  const {
    fetch: { data: connectionInfo },
  } = useConnection({ odinId: odinId });
  const {
    disconnect: { mutate: disconnect, error: disconnectError },
    revokeConnectionRequest: {
      mutate: revokeRequest,
      status: revokeRequestStatus,
      error: revokeError,
    },
    block: { mutate: block, error: blockError },
    unblock: { mutate: unblock, status: unblockStatus, error: unblockError },
  } = useConnectionActions();

  const { data: identityIfollow, isFetched: followStateFetched } = useIdentityIFollow({
    odinId,
  }).fetch;
  const isFollowing = !followStateFetched ? undefined : !!identityIfollow;

  // Contact data:
  const { data: contactData } = useContact({
    odinId: odinId,
    canSave: connectionInfo?.status === 'connected',
  }).fetch;
  const contactContent = contactData?.fileMetadata?.appData?.content;
  const mainAction =
    connectionInfo?.status === 'connected' ? null : connectionInfo?.status === 'sent' ? (
      <>
        <ActionButton
          type="remove"
          onClick={() => {
            revokeRequest(
              { targetOdinId: odinId },
              { onSuccess: () => navigate('/owner/connections') }
            );
          }}
          state={revokeRequestStatus}
        >
          {t('Revoke')}
        </ActionButton>
      </>
    ) : connectionInfo?.status === 'blocked' ? (
      <ActionButton
        type="remove"
        onClick={() => unblock(odinId)}
        state={unblockStatus}
        confirmOptions={{
          type: 'info',
          title: `${t('Unblock')} ${odinId}`,
          buttonText: t('Unblock'),
          body: `${t('Are you sure you want to unblock')} ${odinId}`,
        }}
      >
        {t('Unblock')}
      </ActionButton>
    ) : connectionInfo?.status !== 'pending' ? (
      <>
        <ActionButton type="primary" onClick={() => setIsSentConnectionOpen(true)}>
          {t('Connect')}
        </ActionButton>
      </>
    ) : null;

  const isConnected = connectionInfo?.status === 'connected';
  const identity = getIdentity();
  const actionGroupOptions: ActionGroupOptionProps[] = [
    {
      icon: House,
      label: t('Open homepage'),
      onClick: () => {
        window.open(
          `https://${odinId}${isConnected && identity ? '?youauth-logon=' + identity : ''}`,
          '_blank'
        );
      },
    },
  ];

  const blockConfirmOptions = {
    title: `${t('Block')} ${odinId}`,
    buttonText: t('Block'),
    body: `${t('Are you sure you want to block')} ${odinId}`,
  };

  if (connectionInfo?.status !== 'blocked' && connectionInfo?.status) {
    actionGroupOptions.push({
      icon: Block,
      label: t('Block'),
      onClick: () => block(odinId),
      confirmOptions: blockConfirmOptions,
    });
  }

  if (connectionInfo?.status === 'connected') {
    actionGroupOptions.push({
      icon: Trash,
      label: t('Remove'),
      onClick: () => {
        disconnect({ connectionOdinId: odinId });
        navigate('/owner/connections');
      },
      confirmOptions: {
        title: `${t('Remove')} ${odinId}`,
        buttonText: t('Remove'),
        body: `${t('Are you sure you want to remove')} ${odinId} ${t(
          'from your connections. They will lose all existing access.'
        )}`,
      },
    });
  }

  if (isFollowing === false) {
    actionGroupOptions.push({
      icon: Persons,
      label: t('Follow'),
      href: `/owner/follow/following/${odinId}`,
    });
  }

  return (
    <>
      <ErrorNotification error={disconnectError || revokeError || blockError || unblockError} />

      <PageMeta
        icon={Persons}
        title={
          <>
            <span className="flex flex-col">
              <span className="block leading-tight">
                {`${
                  contactContent?.name
                    ? contactContent.name.displayName ??
                      `${contactContent.name.givenName || ''} ${contactContent.name.surname || ''}`
                    : odinId
                }`}
              </span>
              <small className="block text-sm leading-none">{`(${
                connectionInfo?.status || 'none'
              })`}</small>
            </span>
          </>
        }
        actions={
          <>
            {mainAction}
            <ActionGroup
              options={actionGroupOptions}
              type="secondary"
              size="square"
              children={t('More')}
              icon={Ellipsis}
            />
          </>
        }
        breadCrumbs={[{ href: '/owner/connections', title: 'Contacts' }, { title: odinId }]}
        browserTitle={
          connectionInfo?.status === 'connected' && contactContent?.name
            ? contactContent.name.displayName ??
              `${contactContent.name.givenName} ${contactContent.name.surname}`
            : odinId
        }
      />

      <OutgoingConnectionDialog
        title={t('Send connection request')}
        isOpen={isSentConnectionOpen}
        targetOdinId={odinId}
        onConfirm={() => setIsSentConnectionOpen(false)}
        onCancel={() => setIsSentConnectionOpen(false)}
      />
      {isBlockConfirmationOpen ? (
        <ConfirmDialog
          {...blockConfirmOptions}
          onConfirm={() => {
            block(odinId);
            setIsBlockConfirmationOpen(false);
          }}
          onCancel={() => setIsBlockConfirmationOpen(false)}
        />
      ) : null}
    </>
  );
};
