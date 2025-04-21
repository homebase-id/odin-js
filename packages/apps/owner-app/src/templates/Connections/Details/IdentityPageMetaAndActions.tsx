import { useNavigate, useParams } from 'react-router-dom';
import { OWNER_ROOT, PageMeta, useDetailedConnectionInfo } from '@homebase-id/common-app';
import { useContact } from '@homebase-id/common-app';
import { useEffect } from 'react';
import { useConnectionActions } from '../../../hooks/connections/useConnectionActions';
import { hasDebugFlag, jsonStringify64 } from '@homebase-id/js-lib/helpers';
import { OutgoingConnectionDialog } from '../../../components/Connection/ConnectionDialogs/OutgoingConnectionDialog';
import { ApiType, DotYouClient } from '@homebase-id/js-lib/core';
import {
  useIdentityIFollow,
  ActionButton,
  t,
  ActionGroupOptionProps,
  useErrors,
  ErrorNotification,
  ActionGroup,
  ConfirmDialog,
  useConnectionGrantStatus,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import {
  House,
  Block,
  Trash,
  HeartBeat,
  Persons,
  Ellipsis,
  Bubble,
} from '@homebase-id/common-app/icons';

export const IdentityPageMetaAndActions = ({ odinId }: { odinId: string }) => {
  const navigate = useNavigate();
  const { action } = useParams();
  const isSentConnectionOpen = action === 'connect';
  const isBlockConfirmationOpen = action === 'block';

  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();

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
  } = useDetailedConnectionInfo({ odinId: odinId });
  const {
    disconnect: { mutateAsync: disconnect },
    revokeConnectionRequest: {
      mutate: revokeRequest,
      status: revokeRequestStatus,
      error: revokeError,
    },
    block: { mutate: block, error: blockError },
    unblock: { mutate: unblock, status: unblockStatus, error: unblockError },
  } = useConnectionActions();

  const {
    fetch: { data: identityIfollow, isFetched: followStateFetched },
    unfollow: { mutateAsync: unfollow },
  } = useIdentityIFollow({
    odinId,
  });

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
      <ActionButton
        type="primary"
        onClick={() => navigate(`${OWNER_ROOT}/connections/${odinId}/connect`)}
      >
        {t('Connect')}
      </ActionButton>
    ) : null;

  const isConnected = connectionInfo?.status === 'connected';

  const actionGroupOptions: ActionGroupOptionProps[] = [
    {
      icon: House,
      label: t('Open homepage'),
      onClick: () => {
        window.open(
          `${new DotYouClient({ hostIdentity: odinId, api: ApiType.Guest }).getRoot()}${isConnected && loggedOnIdentity ? '?youauth-logon=' + loggedOnIdentity : ''}`,
          '_blank'
        );
      },
    },
  ];

  const { add: addError } = useErrors();
  const { data: grantStatus, refetch: refetchGrantStatus } = useConnectionGrantStatus({
    odinId: isConnected ? odinId : undefined,
  }).fetchStatus;
  const doDownloadStatusUrl = async () => {
    await refetchGrantStatus();
    const stringified = jsonStringify64(grantStatus);
    const url = window.URL.createObjectURL(
      new Blob([stringified], { type: 'application/json;charset=utf-8' })
    );

    // Dirty hack for easy download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${odinId}.json`;
    link.click();
  };

  if (connectionInfo?.status === 'connected') {
    actionGroupOptions.push({
      label: t('Open chat'),
      href: `/apps/chat/open/${odinId}`,
      icon: Bubble,
    });

    if (hasDebugFlag()) {
      actionGroupOptions.push({
        icon: HeartBeat,
        label: t('Grant Status'),
        onClick: doDownloadStatusUrl,
      });
    }

    actionGroupOptions.push({
      icon: Trash,
      label: t('Disconnect'),
      actionOptions: {
        title: `${t('Disconnect')} ${odinId}`,
        body: `${t('Are you sure you want to remove')} ${odinId} ${t(
          'from your connections. They will lose all existing access.'
        )}`,
        options: [
          isFollowing
            ? {
                children: t('Unfollow & Disconnect'),
                type: 'remove',
                onClick: async () => {
                  try {
                    await unfollow({ odinId });
                    await disconnect({ connectionOdinId: odinId });
                    navigate('/owner/connections');
                  } catch (e) {
                    addError(e, t('Failed to remove a connection'));
                  }
                },
              }
            : undefined,
          {
            children: t('Disconnect'),
            type: isFollowing ? 'secondary' : 'primary',
            onClick: async () => {
              try {
                await disconnect({ connectionOdinId: odinId });
                navigate('/owner/connections');
              } catch (e) {
                addError(e, t('Failed to remove a connection'));
              }
            },
          },
          isFollowing
            ? {
                children: t('Unfollow'),
                type: 'secondary',
                onClick: async () => {
                  try {
                    await unfollow({ odinId });
                  } catch (e) {
                    addError(e, t('Failed to remove a connection'));
                  }
                },
              }
            : undefined,
        ],
      },
    });
  }

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

  return (
    <>
      <ErrorNotification error={revokeError || blockError || unblockError} />

      <PageMeta
        icon={Persons}
        title={
          <>
            <span className="flex flex-col">
              <span className="block leading-tight">
                {`${
                  contactContent?.name
                    ? (contactContent.name.displayName ??
                      `${contactContent.name.givenName || ''} ${contactContent.name.surname || ''}`)
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
              children={t('More')}
              icon={Ellipsis}
            />
          </>
        }
        breadCrumbs={[{ href: '/owner/connections', title: 'Connections' }, { title: odinId }]}
        browserTitle={
          connectionInfo?.status === 'connected' && contactContent?.name
            ? (contactContent.name.displayName ??
              `${contactContent.name.givenName || ''} ${contactContent.name.surname || odinId}`)
            : odinId
        }
      />

      <OutgoingConnectionDialog
        title={t('Send connection request')}
        isOpen={isSentConnectionOpen}
        targetOdinId={odinId}
        onConfirm={() => navigate(-1)}
        onCancel={() => navigate(-1)}
      />
      {isBlockConfirmationOpen ? (
        <ConfirmDialog
          {...blockConfirmOptions}
          onConfirm={() => {
            block(odinId);
            navigate(-1);
          }}
          onCancel={() => navigate(-1)}
        />
      ) : null}
    </>
  );
};
