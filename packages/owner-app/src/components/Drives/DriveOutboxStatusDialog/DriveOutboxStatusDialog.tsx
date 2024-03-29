import { usePortal, DialogWrapper, ActionButton, Arrow, t } from '@youfoundation/common-app';
import { TargetDrive } from '@youfoundation/js-lib/core';
import { createPortal } from 'react-dom';
import { useDrive } from '../../../hooks/drives/useDrive';

export const DriveOutboxStatusDialog = ({
  targetDrive,
  isOpen,
  onClose,
}: {
  targetDrive: TargetDrive;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');
  const {
    fetchOutboxStatus: { data: outboxStatus, isLoading: outboxStatusLoading },
  } = useDrive({
    targetDrive: targetDrive,
    fetchOutboxStatus: true,
  });

  if (!isOpen) return null;
  console.log(outboxStatus, outboxStatusLoading);

  const dialog = (
    <DialogWrapper title={t('Outbox status')} onClose={onClose}>
      <>
        <div className="flex flex-col gap-2">
          <p>
            <span className="block text-slate-400">{t('Checked out count')}</span>
            {outboxStatus?.checkedOutCount}
          </p>
          <p>
            <span className="block text-slate-400">{t('Next item run')}</span>
            {outboxStatus?.nextItemRun}
          </p>
          <p>
            <span className="block text-slate-400">{t('Total items')}</span>
            {outboxStatus?.totalItems}
          </p>
        </div>

        <div className="flex flex-row-reverse gap-2 py-3">
          <ActionButton icon={Arrow} onClick={onClose}>
            {t('Ok')}
          </ActionButton>
        </div>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
