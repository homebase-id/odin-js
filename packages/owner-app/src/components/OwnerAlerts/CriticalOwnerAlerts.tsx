import { Toast, t } from '@youfoundation/common-app';
import { useAccountRemoval } from '../../hooks/removal/useAccountRemoval';

export const CriticalOwnerAlerts = () => {
  const {
    status: { data: statusData },
  } = useAccountRemoval();

  const isScheduledForDeletion = !!statusData?.plannedDeletionDate;

  if (!isScheduledForDeletion) return null;

  const date = new Date(statusData.plannedDeletionDate as number);

  return (
    <div className="fixed bottom-2 left-2 right-2 z-50 grid grid-flow-row gap-4 sm:bottom-auto sm:left-auto sm:right-8 sm:top-8">
      <Toast
        type={'critical'}
        title={`${t(
          'Your account is scheduled for deletion'
        )} ${date.toLocaleDateString()}. Click for info`}
        href="/owner/settings/delete"
      />
    </div>
  );
};
