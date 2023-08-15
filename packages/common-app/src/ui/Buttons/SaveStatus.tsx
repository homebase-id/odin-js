import { useEffect, useState } from 'react';
import { t } from '@youfoundation/common-app';

import { Alert } from '@youfoundation/common-app';
import { format } from '../../helpers/timeago';

export const SaveStatus = ({
  className,
  state,
  error,
}: {
  className: string;
  state: 'error' | 'idle' | 'loading' | 'success';
  error?: unknown;
}) => {
  const [lastSave, setLastSave] = useState<Date>();
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    if (state === 'success') {
      setLastSave(new Date());
    }
  }, [state]);

  // Use effect to trigger a render each 5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setNow(new Date());
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [now]);

  if (state === 'loading') {
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
      {t('Last saved')} {format(lastSave)}
    </p>
  );
};
