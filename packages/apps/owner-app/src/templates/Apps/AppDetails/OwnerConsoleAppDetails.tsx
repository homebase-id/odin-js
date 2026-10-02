import { Link } from 'react-router-dom';
import { getOwnerCirclePath, LoadingBlock, PageMeta, t, useCircles } from '@homebase-id/common-app';
import { Arrow, Circles as CirclesIcon, Grid } from '@homebase-id/common-app/icons';
import Section from '../../../components/ui/Sections/Section';
import { DriveView } from '../../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import { useDrives } from '../../../hooks/drives/useDrives';
import { isOwnerConsoleApp } from '../../../hooks/apps/useOwnerAppName';

/**
 * The owner console's own page, in the place an app's page would be.
 *
 * Drives and circles are shown under the app that owns them. The owner console is not a
 * registered app, so it has none of an app's devices, grants or permissions to show -- only what it
 * owns: its own drives and circles, and those that predate app ownership and belong to no app yet.
 */
const OwnerConsoleAppDetails = () => {
  const { data: circles, isLoading: circlesLoading } = useCircles().fetch;
  const {
    fetch: { data: drives, isLoading: drivesLoading },
  } = useDrives();

  const ownedDrives = (drives ?? []).filter((drive) => isOwnerConsoleApp(drive.appId));
  const ownedCircles = (circles ?? []).filter((circle) => isOwnerConsoleApp(circle.appId));

  return (
    <>
      <PageMeta
        icon={Grid}
        title={t('Owner console')}
        breadCrumbs={[
          { href: '/owner/apps', title: 'My apps' },
          { title: t('Owner console') },
        ]}
      />
      <p className="mb-4 max-w-prose text-slate-400">
        {t(
          'Drives and circles the owner console owns, and those that predate app ownership and belong to no app yet. Open one to hand it to an app.'
        )}
      </p>
      <div className="grid gap-4 sm:grid-flow-col sm:grid-cols-2">
        <Section title={`${t('Drives it owns')} (${ownedDrives.length})`}>
          {drivesLoading ? (
            <LoadingBlock className="h-10" />
          ) : ownedDrives.length ? (
            <div className="-my-4">
              {ownedDrives.map((drive) => (
                <DriveView
                  drive={drive}
                  className="my-4"
                  key={`${drive.targetDriveInfo.alias}-${drive.targetDriveInfo.type}`}
                />
              ))}
            </div>
          ) : (
            <p className="text-slate-400">{t('No drives owned by the owner console')}</p>
          )}
        </Section>

        <Section title={`${t('Circles it owns')} (${ownedCircles.length})`}>
          {circlesLoading ? (
            <LoadingBlock className="h-10" />
          ) : ownedCircles.length ? (
            <div className="-my-4">
              {ownedCircles.map((circle) => (
                <div key={circle.id} className="my-4 flex flex-row">
                  <Link
                    to={getOwnerCirclePath(circle.appId, circle.id ?? '')}
                    className="flex flex-row hover:text-slate-700 hover:underline dark:hover:text-slate-400"
                  >
                    <CirclesIcon className="mb-auto mr-3 mt-1 h-6 w-6 flex-shrink-0" />
                    <div className="mr-2 flex flex-col">
                      <p className="my-auto">{circle.name}</p>
                    </div>
                    <Arrow className="my-auto ml-auto h-5 w-5" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">{t('No circles owned by the owner console')}</p>
          )}
        </Section>
      </div>
    </>
  );
};

export default OwnerConsoleAppDetails;
