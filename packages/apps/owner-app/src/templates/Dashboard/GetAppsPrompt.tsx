import { useState } from 'react';
import { t } from '@homebase-id/common-app';
import { Times } from '@homebase-id/common-app/icons';
import { FileSyncAppCard, HomebaseAppCard } from '../GetApps/AppCards';

const DISMISSED_KEY = 'getAppsPromptDismissed';

export const GetAppsPrompt = () => {
  const [isDismissed, setIsDismissed] = useState(localStorage.getItem(DISMISSED_KEY) === '1');
  if (isDismissed) return null;

  return (
    <div className="mt-10 max-w-2xl">
      <div className="mb-4 flex flex-row items-start justify-between gap-4">
        <div>
          <p className="text-2xl">{t('Take Homebase with you')}</p>
          <p className="text-slate-400">{t('Two apps that make your Homebase part of your day.')}</p>
        </div>
        <button
          className="p-1 opacity-50 hover:opacity-100"
          title={t('Dismiss')}
          onClick={() => {
            localStorage.setItem(DISMISSED_KEY, '1');
            setIsDismissed(true);
          }}
        >
          <Times className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <HomebaseAppCard />
        <FileSyncAppCard />
      </div>
    </div>
  );
};
