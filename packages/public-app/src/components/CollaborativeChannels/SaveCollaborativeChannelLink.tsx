import { ChannelDefinitionVm, ActionLink, Plus, t } from '@youfoundation/common-app';
import { HomebaseFile, SecurityGroupType } from '@youfoundation/js-lib/core';
import {
  RemoteCollaborativeChannelDefinition,
  CollaborativeChannelDefinition,
} from '@youfoundation/js-lib/public';
import { useAuth } from '../../hooks/auth/useAuth';
import { useCheckWriteAccessOnChannel } from './PublicPostComposer';

export const SaveCollaborativeChannelLink = ({
  channel,
  className,
}: {
  channel: HomebaseFile<ChannelDefinitionVm>;
  className?: string;
}) => {
  const { isOwner, getIdentity, getDotYouClient } = useAuth();
  const loggedInIdentity = getIdentity();
  const identity = getDotYouClient().getIdentity();

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
    odinId: identity,
    uniqueId: channel.fileMetadata.appData.uniqueId,
    isCollaborative: true,
  };

  return (
    <ActionLink
      className={`w-auto ${className ?? ''}`}
      href={`https://${loggedInIdentity}/apps/feed/channels/incoming-collaborative?channel=${JSON.stringify(remoteGroupChannel)}`}
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