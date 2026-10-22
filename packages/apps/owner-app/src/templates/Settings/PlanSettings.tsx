import { useEffect } from 'react';
import { t, Label, bytesToSize, Alert, ActionLink } from '@homebase-id/common-app';
import { Link, useSearchParams } from 'react-router-dom';
import Section from '../../components/ui/Sections/Section';
import { usePlan } from '../../hooks/settings/usePlan';
import { StorageUsage } from '../../provider/system/PlanProvider';

export const PlanSettings = () => {
  const { data: plan, isLoading, error } = usePlan();
  // The apps link here with ?upgrade=1 when the owner asks how to get more space
  const [searchParams] = useSearchParams();
  const askedToUpgrade = searchParams.get('upgrade') === '1';
  // Only ever the address the server has configured, never one from the link
  const upgradeUrl = plan?.upgradeUrl?.startsWith('https://') ? plan.upgradeUrl : undefined;
  const redirecting = askedToUpgrade && !!upgradeUrl;

  useEffect(() => {
    // replace, so Back from the provider's page does not land here and bounce straight back
    if (redirecting && upgradeUrl) window.location.replace(upgradeUrl);
  }, [redirecting, upgradeUrl]);

  if (redirecting) {
    return (
      <Section title={t('Plan & storage')}>
        <p className="text-slate-400">{t('Taking you to your hosting provider...')}</p>
      </Section>
    );
  }

  return (
    <Section title={t('Plan & storage')}>
      {askedToUpgrade && !isLoading && (
        <Alert type="info" title={t('Get more space')} className="mb-5">
          <p>
            {t(
              'Your plan is set by your hosting provider. To get more storage, or a public home page, contact them and ask to move your identity to a larger plan.'
            )}
          </p>
          <p className="mt-2">
            {t('Until then, you can free up space by deleting photos, videos and files.')}{' '}
            <Link to="/owner/apps" className="underline">
              {t('See what each app stores')}
            </Link>
          </p>
        </Alert>
      )}
      {isLoading && <p className="text-slate-400">{t('Loading...')}</p>}
      {error && <p className="text-red-600">{t('Your plan could not be loaded')}</p>}
      {!isLoading && !error && !plan && (
        <p className="text-slate-400">{t('This server does not have hosting plans')}</p>
      )}

      {/* Always there: the hosting provider's upgrade page when it has one, otherwise how to reach them */}
      {!isLoading && !askedToUpgrade && (
        <div className="mb-5">
          <ActionLink href={upgradeUrl ?? '/owner/settings/plan?upgrade=1'} className="w-fit">
            {t('See plans and upgrade')}
          </ActionLink>
        </div>
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
