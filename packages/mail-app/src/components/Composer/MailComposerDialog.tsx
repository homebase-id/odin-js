import { createPortal } from 'react-dom';
import { ActionButton, Times, t, usePortal } from '@youfoundation/common-app';
import { useMailDraft } from '../../hooks/mail/useMailConversation';
import { useSearchParams } from 'react-router-dom';
import { MailComposer } from './MailComposer';

export const ComposerDialog = ({ onClose }: { onClose: () => void }) => {
  const target = usePortal('modal-container');

  const [searchParams] = useSearchParams();
  const draftFileId = searchParams.get('new');
  const isDraft = !!draftFileId;

  const { data: draftDsr } = useMailDraft(isDraft ? { draftFileId } : undefined).getDraft;

  const dialog = (
    <div className="fixed bottom-16 right-3 w-[calc(100%-1.5rem)] max-w-xl rounded-lg bg-background shadow-md md:bottom-5 md:right-5">
      <div className="flex flex-row items-center justify-between px-5 pt-3">
        <h2>{isDraft ? t('Edit draft') : t('New mail')}</h2>
        <ActionButton type="mute" icon={Times} onClick={onClose} size="square" />
      </div>
      <div className="px-5 py-5">
        {isDraft ? (
          draftDsr ? (
            <MailComposer onDone={onClose} existingDraft={draftDsr} key={draftDsr.fileId} />
          ) : null
        ) : (
          <MailComposer onDone={onClose} />
        )}
      </div>
    </div>
  );

  return createPortal(dialog, target);
};
