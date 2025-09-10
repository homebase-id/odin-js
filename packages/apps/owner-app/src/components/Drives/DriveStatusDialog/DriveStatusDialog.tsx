import { usePortal, DialogWrapper, ActionButton, t, bytesToSize } from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';
import { TargetDrive } from '@homebase-id/js-lib/core';
import { createPortal } from 'react-dom';
import { useDrive } from '../../../hooks/drives/useDrive';
import { formatDateExludingYearIfCurrent } from '@homebase-id/common-app';

export const DriveStatusDialog = ({
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
    fetchStatus: { data: outboxStatus },
  } = useDrive({
    targetDrive: targetDrive,
    fetchOutboxStatus: true,
  });

  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper title={t('Drive status')} onClose={onClose}>
      <>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg">Inbox</h2>
            <p>
              <span className="block text-slate-400">{t('Oldest timestamp')}</span>
              {outboxStatus?.inbox.oldestItemTimestamp}
              <span>
                {outboxStatus?.inbox.oldestItemTimestamp
                  ? formatDateExludingYearIfCurrent(
                      new Date(outboxStatus.inbox.oldestItemTimestamp)
                    )
                  : null}
              </span>
            </p>
            <p>
              <span className="block text-slate-400">{t('Popped count')}</span>
              {outboxStatus?.inbox?.poppedCount}
            </p>
            <p>
              <span className="block text-slate-400">{t('Total items')}</span>
              {outboxStatus?.inbox?.totalItems}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-lg">Outbox</h2>
            <p>
              <span className="block text-slate-400">{t('Checked out count')}</span>
              {outboxStatus?.outbox?.checkedOutCount}
            </p>
            <p>
              <span className="block text-slate-400">{t('Next item run')}</span>
              {outboxStatus?.outbox?.nextItemRun}
            </p>
            <p>
              <span className="block text-slate-400">{t('Total items')}</span>
              {outboxStatus?.outbox?.totalItems}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-lg">Size info</h2>
            <p>
              <span className="block text-slate-400">{t('Number of meta files')}</span>
              {outboxStatus?.sizeInfo?.fileCount}
            </p>
            <p>
              <span className="block text-slate-400">{t('Total size')}</span>
              {outboxStatus?.sizeInfo?.size ? bytesToSize(outboxStatus.sizeInfo.size) : '0 B'}
            </p>
          </div>
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
