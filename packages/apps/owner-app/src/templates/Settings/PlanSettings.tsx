import { t, Label, bytesToSize, ActionLink, planStorageText } from '@homebase-id/common-app';
import { Link } from 'react-router-dom';
import Section from '../../components/ui/Sections/Section';
import { usePlan } from '../../hooks/settings/usePlan';
import { HostingProvider, StorageUsage } from '../../provider/system/PlanProvider';

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

      {/* Always there: how to get a bigger plan, from the hosting provider when there is one */}
      {!isLoading && !error && <UpgradeBox hostingProvider={plan?.hostingProvider} />}
    </Section>
  );
};

const UpgradeBox = ({ hostingProvider }: { hostingProvider?: HostingProvider | null }) => {
  // Only ever the address the server gives, and only https
  const upgradeUrl = hostingProvider?.upgradeUrl?.startsWith('https://')
    ? hostingProvider.upgradeUrl
    : undefined;

  return (
    <div className="mt-2 max-w-2xl rounded-lg border border-indigo-300 bg-indigo-50 p-5 dark:border-indigo-700 dark:bg-indigo-950">
      <h2 className="mb-1 text-lg font-semibold">{t('Need more space?')}</h2>
      {hostingProvider && upgradeUrl ? (
        <>
          <p className="mb-4 text-slate-600 dark:text-slate-300">
            {t('Your plan comes from')} {hostingProvider.displayName}.{' '}
            {t('See the plans they offer, and move to a bigger one in a few steps.')}
          </p>
          <ActionLink href={upgradeUrl} type="primary" className="w-full text-base sm:w-auto">
            {t('See plans at')} {hostingProvider.displayName}
          </ActionLink>
        </>
      ) : (
        <p className="text-slate-600 dark:text-slate-300">
          {hostingProvider
            ? `${t('To get more space, contact')} ${hostingProvider.displayName}.`
            : t('To get more space, contact whoever runs your Homebase server.')}
        </p>
      )}
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        {t('You can also free up space by deleting photos, videos and files.')}{' '}
        <Link to="/owner/apps" className="underline">
          {t('See what each app stores')}
        </Link>
      </p>
    </div>
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

  // "12% of 500 GB used", then what is used and free in the plan's own unit: no MB against GB to convert
  const text = planStorageText(usedBytes, quotaBytes);
  const width = quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 100;
  return (
    <div className="max-w-lg">
      <p className="mb-2">
        {text.percent === null ? t('Less than 1%') : `${text.percent}%`} {t('of')} {text.size}{' '}
        {t('used')}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full ${isOverQuota ? 'bg-red-600' : 'bg-indigo-500'}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-400">
        {text.used.under ? `${t('Under')} ${text.used.amount}` : text.used.amount} {t('used')} ·{' '}
        {text.free} {t('free')}
      </p>
    </div>
  );
};
