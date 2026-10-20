import { t, Label, bytesToSize } from '@homebase-id/common-app';
import Section from '../../components/ui/Sections/Section';
import { usePlan } from '../../hooks/settings/usePlan';
import { StorageUsage } from '../../provider/system/PlanProvider';

export const PlanSettings = () => {
  const { data: plan, isLoading, error } = usePlan();

  return (
    <Section title={t('Plan & storage')}>
      {isLoading && <p className="text-slate-400">{t('Loading...')}</p>}
      {error && <p className="text-red-600">{t('Your plan could not be loaded')}</p>}
      {!isLoading && !error && !plan && (
        <p className="text-slate-400">{t('This server does not have hosting plans')}</p>
      )}

      {plan && (
        <>
          <div className="mb-5">
            <Label>{t('Plan')}</Label>
            <p className="text-slate-400">{plan.id ?? t('No plan')}</p>
          </div>

          <div className="mb-5">
            <Label>{t('Storage')}</Label>
            <StorageBar {...plan.storage} />
            {plan.storage.isOverQuota && (
              <p className="mt-2 max-w-lg text-red-600">
                {t(
                  'Your storage is full. New photos, videos and files are refused until you delete some, or move to a plan with more room.'
                )}
              </p>
            )}
          </div>

          <div className="mb-5">
            <Label>{t('Public web presence')}</Label>
            <p className="text-slate-400">
              {plan.publicWebPresence
                ? t('Your public home page is on')
                : t('Your plan does not include a public home page')}
            </p>
          </div>
        </>
      )}
    </Section>
  );
};

const StorageBar = ({ usedBytes, quotaBytes, isOverQuota }: StorageUsage) => {
  if (quotaBytes === null) {
    return (
      <p className="text-slate-400">
        {bytesToSize(usedBytes)} {t('used')}, {t('unlimited')}
      </p>
    );
  }

  const percent = quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 100;
  return (
    <div className="max-w-lg">
      <p className="mb-2 text-slate-400">
        {bytesToSize(usedBytes)} {t('of')} {bytesToSize(quotaBytes)} {t('used')}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full ${isOverQuota ? 'bg-red-600' : 'bg-indigo-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
