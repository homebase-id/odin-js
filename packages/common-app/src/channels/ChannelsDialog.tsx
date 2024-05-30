import { useState } from 'react';
import { createPortal } from 'react-dom';

import { usePortal } from '../hooks/portal/usePortal';
import { useChannels } from '../hooks/posts/channels/useChannels';
import { DialogWrapper } from '../ui/Dialog/DialogWrapper';
import { Quote } from '../ui/Icons/Quote';
import { ActionButton } from '../ui/Buttons/ActionButton';
import { Plus } from '../ui/Icons/Plus';
import { t } from '../helpers/i18n/dictionary';
import { ChannelItem } from './ChannelItem';

export const ChannelsDialog = ({
  isOpen,

  onCancel,
}: {
  isOpen: boolean;

  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const { data: channels } = useChannels({ isAuthenticated: true, isOwner: true });
  const [isAddNew, setIsAddNew] = useState(false);

  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper
      title={
        <div className="flex flex-row items-center">
          <Quote className="mr-2 h-6 w-6" /> {t('Channels')}
        </div>
      }
      onClose={onCancel}
      isSidePanel={true}
      size="4xlarge"
      keepOpenOnBlur={true}
    >
      <div className="flex flex-col gap-2">
        {channels?.map((chnl) => (
          <ChannelItem key={chnl.fileId} chnl={chnl} className="bg-slate-50 dark:bg-slate-900" />
        ))}
        {isAddNew ? (
          <ChannelItem
            key={'new'}
            onClose={() => setIsAddNew(false)}
            className="bg-slate-50 dark:bg-slate-900"
          />
        ) : (
          <div
            key={'new'}
            onClick={() => setIsAddNew(true)}
            className="flex cursor-pointer flex-row items-center rounded-md border border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <Plus className="mr-2 h-5 w-5" /> {t('Add new')}
          </div>
        )}
      </div>
      <div className="gap-2 flex flex-row-reverse py-3">
        <ActionButton onClick={onCancel} type="secondary">
          {t('Cancel')}
        </ActionButton>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
