import { useEffect, useState } from 'react';
import { formatToTimeAgo } from '../../helpers/timeago';
import { t } from '../../helpers';
import { Alert } from '../Alert/Alert';
import { ActionButtonState } from './ActionButton';

export const SaveStatus = ({
  className,
  state,
  error,
}: {
  className: string;
  state: ActionButtonState;
  error?: unknown;
}) => {
  const [lastSave, setLastSave] = useState<Date>();
  const [, setNow] = useState<Date>(new Date());
  useEffect(() => {
    if (state === 'success') {
      setLastSave(new Date());
    }
  }, [state]);

  // Use effect to trigger a render each 5s
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [setNow]);

  if (state === 'loading' || state === 'pending') {
    return <p className={`${className} text-sm`}>Saving...</p>;
  }

  if (state === 'error') {
    return (
      <Alert type="critical" className={className}>
        {error instanceof Error ? error.message : t('Something went wrong')}
      </Alert>
    );
  }

  if (!lastSave) {
    return null;
  }

  return (
    <p className={`${className} text-sm text-slate-400`}>
      {t('Last saved')} {formatToTimeAgo(lastSave)}
    </p>
  );
};
