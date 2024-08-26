import { t } from '@homebase-id/common-app';
import { Arrow, Shield } from '@homebase-id/common-app/icons';

const UrlNotifier = () => {
  return (
    <div className="border-b border-slate-100 bg-slate-50 py-8 pb-8 pt-4 dark:border-b-slate-400 dark:bg-slate-700 dark:text-slate-100">
      <div className="container mx-auto px-5 sm:px-10">
        <div className="mb-4 hidden flex-row sm:flex">
          <Arrow className="left-[16rem] mx-auto mr-auto h-16 w-16 -rotate-90 animate-pulse md:relative md:mx-0" />
        </div>
        <div className="mx-auto max-w-[30rem] sm:mx-0">
          <div className="mb-4 flex flex-row">
            <Shield className="mr-2 h-8 w-8" />
            <p className="my-auto text-4xl">{t('Check the Url')}</p>
          </div>
          <p className="dark:text-slate-400">
            {t(
              'Please confirm that the browser url matches your identity to avoid unauthorized access to your identity'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UrlNotifier;
