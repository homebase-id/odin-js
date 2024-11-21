import { ActionLink, t, useDotYouClientContext } from '@homebase-id/common-app';
import { ApiType, DotYouClient, HomebaseFile, SecurityGroupType } from '@homebase-id/js-lib/core';
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
  const dotYouClient = useDotYouClientContext();
  const loggedInIdentity = dotYouClient.getLoggedInIdentity();
  const ownerIdentity = dotYouClient.getHostIdentity();
  const isOwner = dotYouClient.isOwner();

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
      href={`${new DotYouClient({ hostIdentity: loggedInIdentity, api: ApiType.Guest }).getRoot()}/apps/feed/channels/incoming-collaborative?channel=${JSON.stringify(remoteGroupChannel)}`}
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
