import { t } from '@homebase-id/common-app';
import { FileSyncAppCard, HomebaseAppCard } from '../GetApps/AppCards';

// Always shown: people land on the dashboard after signing up, and this is where they find the
// apps; nothing else in the console links the downloads.
export const GetAppsPrompt = () => (
  <div className="mt-10 max-w-2xl">
    <div className="mb-4">
      <p className="text-2xl">{t('Take Homebase with you')}</p>
      <p className="text-slate-400">{t('Two apps that make your Homebase part of your day.')}</p>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <HomebaseAppCard />
      <FileSyncAppCard />
    </div>
  </div>
);
