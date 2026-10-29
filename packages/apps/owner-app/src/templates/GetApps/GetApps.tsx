import { t, PageMeta } from '@homebase-id/common-app';
import { Download } from '@homebase-id/common-app/icons';
import { FileSyncAppCard, HomebaseAppCard } from './AppCards';

const GetApps = () => (
  <>
    <PageMeta title={t('Get the apps')} icon={Download} />

    <p className="max-w-md text-slate-400">{t('Your Homebase on your phone and computer.')}</p>

    <div className="mt-8 grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
      <HomebaseAppCard />
      <FileSyncAppCard showSetupHint />
    </div>
  </>
);

export default GetApps;
