import { HomebaseFile } from '@homebase-id/js-lib/core';

import { RemoteCollaborativeChannelDefinition } from '@homebase-id/js-lib/public';
import { t } from '../helpers/i18n/dictionary';
import { ActionGroup } from '../ui/Buttons/ActionGroup';
import { Trash } from '../ui/Icons/Trash';
import { useCollaborativeChannel } from '../hooks/socialFeed/channels/useCollaborativeChannel';
import { CollaborativeChannelItem } from './CollaborativeChannelitem';

export const ManageCollaborativeChannelItem = ({
  odinId,
  className,
  chnlLink,
}: {
  odinId: string;
  className?: string;
  chnlLink: HomebaseFile<RemoteCollaborativeChannelDefinition>;
}) => {
  const { mutate: removeCollaborativeChannel } = useCollaborativeChannel().remove;

  return (
    <CollaborativeChannelItem odinId={odinId} className={className} chnlDsr={chnlLink}>
      {chnlLink.fileId !== '' ? (
        <ActionGroup
          options={[
            {
              label: t('Delete Link'),
              icon: Trash,
              onClick: () => removeCollaborativeChannel(chnlLink),
            },
          ]}
          type="mute"
        />
      ) : (
        <p className="rounded-lg bg-slate-200 px-2 py-1 text-sm dark:bg-slate-600">
          {t('Auto discovered')}
        </p>
      )}
    </CollaborativeChannelItem>
  );
};
