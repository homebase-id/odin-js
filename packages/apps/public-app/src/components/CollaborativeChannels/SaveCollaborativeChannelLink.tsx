import { ActionLink, t, useOdinClientContext } from '@homebase-id/common-app';
import { ApiType, OdinClient, HomebaseFile, SecurityGroupType } from '@homebase-id/js-lib/core';
import {
  RemoteCollaborativeChannelDefinition,
  CollaborativeChannelDefinition,
  ChannelDefinition,
} from '@homebase-id/js-lib/public';

import { Plus } from '@homebase-id/common-app/icons';
import { useCheckWriteAccessOnChannel } from './useCheckWriteAccessOnChannel';

export const SaveCollaborativeChannelLink = ({
  channel,
  className,
}: {
  channel: HomebaseFile<ChannelDefinition>;
  className?: string;
}) => {
  const odinClient = useOdinClientContext();
  const loggedInIdentity = odinClient.getLoggedInIdentity();
  const ownerIdentity = odinClient.getHostIdentity();
  const isOwner = odinClient.isOwner();

  const hasWriteAccess = useCheckWriteAccessOnChannel({ activeChannel: channel });
  if (
    !hasWriteAccess ||
    isOwner ||
    !channel.fileMetadata.appData.content.isCollaborative ||
    !loggedInIdentity
  )
    return null;

  const remoteGroupChannel: RemoteCollaborativeChannelDefinition = {
    acl: channel.serverMetadata?.accessControlList || {
      requiredSecurityGroup: SecurityGroupType.Owner,
    },
    ...('acl' in channel.fileMetadata.appData.content
      ? (channel.fileMetadata.appData.content as CollaborativeChannelDefinition)
      : channel.fileMetadata.appData.content),
    odinId: ownerIdentity,
    uniqueId: channel.fileMetadata.appData.uniqueId,
    isCollaborative: true,
  };

  return (
    <ActionLink
      className={`w-auto ${className ?? ''}`}
      href={`${new OdinClient({ hostIdentity: loggedInIdentity, api: ApiType.Guest }).getRoot()}/apps/feed/channels/incoming-collaborative?channel=${JSON.stringify(remoteGroupChannel)}`}
      icon={Plus}
      type={'primary'}
    >
      <span className="flex flex-col leading-tight">
        {t('Save to Feed')}
        <small className="block">{t('Allows easy access')}</small>
      </span>
    </ActionLink>
  );
};
