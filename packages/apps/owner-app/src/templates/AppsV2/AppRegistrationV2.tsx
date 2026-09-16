import { ReactNode, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ActionButton,
  DomainHighlighter,
  LoadingBlock,
  SubtleMessage,
  t,
  useCircles,
  useDotYouClientContext,
} from '@homebase-id/common-app';
import { Arrow, Check, Exclamation, Loader, Times } from '@homebase-id/common-app/icons';
import {
  addOwnedResourcesV2,
  AppManifestV2,
  AppRegistrationValidationResult,
  decodeBase64UrlJson,
  registerAppV2,
  TargetDriveV2,
  updateAppAuthorizedCirclesV2,
  updateAppPermissionsV2,
} from '@homebase-id/js-lib/auth';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useDrives } from '../../hooks/drives/useDrives';
import {
  useInvalidateAppRegistrationsV2,
  useValidateAppManifestV2,
} from '../../hooks/appsV2/useAppRegistrationsV2';
import Section from '../../components/ui/Sections/Section';
import PermissionView from '../../components/PermissionViews/PermissionView/PermissionView';
import {
  CircleGrantedDrives,
  DriveAccessList,
  OwnedCirclePreview,
  OwnedDriveSummary,
  ProblemsList,
  V2ErrorAlert,
} from '../../components/AppsV2/AppsV2Parts';
import { errorMessageOf, targetDriveKey } from '../../components/AppsV2/appsV2Helpers';
import { PermissionKeyList } from '../../components/Apps/AppOverviewParts';

// /owner/app-registration?m={base64url(JSON AppManifestV2)}&return={url}&cancel={url}

type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';
interface Step {
  key: string;
  label: string;
  status: StepStatus;
  error?: string;
}

const AppRegistrationV2 = () => {
  const [searchParams] = useSearchParams();
  const manifestParam = searchParams.get('m');
  const returnUrl = searchParams.get('return');
  const cancelUrl = searchParams.get('cancel');

  const manifest = useMemo(() => decodeBase64UrlJson<AppManifestV2>(manifestParam), [manifestParam]);

  if (!manifest || !manifest.appId || !returnUrl) {
    return (
      <PageShell>
        <h1 className="mb-5 text-4xl dark:text-white">{t('Bad request')}</h1>
        <p>
          {t(
            'This link is missing its app description (m) or return address (return), or the description could not be read.'
          )}
        </p>
      </PageShell>
    );
  }

  return <AppRegistrationV2Consent manifest={manifest} returnUrl={returnUrl} cancelUrl={cancelUrl} />;
};

const PageShell = ({ children }: { children: ReactNode }) => (
  <section className="my-20">
    <div className="container mx-auto px-5">
      <div className="max-w-[45rem]">{children}</div>
    </div>
  </section>
);

const AppRegistrationV2Consent = ({
  manifest,
  returnUrl,
  cancelUrl,
}: {
  manifest: AppManifestV2;
  returnUrl: string;
  cancelUrl: string | null;
}) => {
  const dotYouClient = useDotYouClientContext();
  const invalidate = useInvalidateAppRegistrationsV2();
  const { data: validation, isLoading, error: validateError } = useValidateAppManifestV2(manifest).validate;
  const { data: drives } = useDrives().fetch;
  const { data: circles } = useCircles().fetch;

  const [steps, setSteps] = useState<Step[] | undefined>();
  const [isApplying, setIsApplying] = useState(false);

  const driveName = (drive: TargetDriveV2) => {
    const key = targetDriveKey(drive);
    return (
      manifest.ownedDrives?.find((d) => targetDriveKey(d.targetDrive) === key)?.name ??
      validation?.diff.driveAccess.find((d) => targetDriveKey(d.targetDrive) === key)?.driveName ??
      drives?.find((d) => targetDriveKey(d.targetDriveInfo) === key)?.name ??
      undefined
    );
  };

  const circleName = (circleId: string) =>
    circles?.find((c) => stringGuidsEqual(c.id, circleId))?.name ??
    manifest.ownedCircles?.find((c) => stringGuidsEqual(c.id, circleId))?.name ??
    circleId;

  const doCancel = () => {
    if (!cancelUrl) {
      window.location.href = '/owner';
      return;
    }
    const url = new URL(cancelUrl, window.location.href);
    url.searchParams.set('error', 'cancelled-by-user');
    window.location.href = url.toString();
  };

  const runSteps = async (initial: Step[], work: Record<string, () => Promise<unknown>>) => {
    let current = initial;
    const update = (key: string, patch: Partial<Step>) => {
      current = current.map((step) => (step.key === key ? { ...step, ...patch } : step));
      setSteps(current);
    };
    setSteps(current);

    for (const step of initial) {
      if (step.status === 'skipped') continue;
      update(step.key, { status: 'running' });
      try {
        await work[step.key]();
        update(step.key, { status: 'done' });
      } catch (error) {
        update(step.key, { status: 'error', error: errorMessageOf(error) });
        return false;
      }
    }
    return true;
  };

  const doAllow = async (result: AppRegistrationValidationResult) => {
    setIsApplying(true);
    const appId = manifest.appId;
    const diff = result.diff;

    let ok: boolean;
    if (!result.isRegistered) {
      ok = await runSteps([{ key: 'register', label: t('Install the app'), status: 'pending' }], {
        register: () => registerAppV2(dotYouClient, manifest),
      });
    } else {
      const needsOwned = diff.drivesToCreate.length > 0 || diff.circlesToCreate.length > 0;
      const needsPermissions =
        diff.permissionKeysGained.length > 0 ||
        diff.permissionKeysLost.length > 0 ||
        diff.driveAccessGained.length > 0 ||
        diff.driveAccessLost.length > 0;
      // The diff does not describe circleMemberPermissionGrant, and the endpoint is a no-op when
      // nothing changed, so it is sent whenever the manifest says anything about circles.
      const needsCircles =
        diff.authorizedCirclesAdded.length > 0 ||
        diff.authorizedCirclesRemoved.length > 0 ||
        manifest.authorizedCircles !== undefined ||
        manifest.circleMemberPermissionGrant !== undefined;

      ok = await runSteps(
        [
          {
            key: 'owned',
            label: t('Create the drives and circles it owns'),
            status: needsOwned ? 'pending' : 'skipped',
          },
          {
            key: 'permissions',
            label: t('Update its permissions and drive access'),
            status: needsPermissions ? 'pending' : 'skipped',
          },
          {
            key: 'circles',
            label: t('Update the circles it works with'),
            status: needsCircles ? 'pending' : 'skipped',
          },
        ],
        {
          owned: () =>
            addOwnedResourcesV2(dotYouClient, appId, {
              ownedDrives: diff.drivesToCreate,
              ownedCircles: diff.circlesToCreate,
            }),
          permissions: () =>
            updateAppPermissionsV2(dotYouClient, appId, {
              permissionSet: manifest.permissionSet ?? { keys: [] },
              drives: manifest.drives ?? [],
            }),
          circles: () =>
            updateAppAuthorizedCirclesV2(dotYouClient, appId, {
              authorizedCircles: manifest.authorizedCircles ?? [],
              circleMemberPermissionGrant: manifest.circleMemberPermissionGrant,
            }),
        }
      );
    }

    invalidate();
    if (ok) {
      window.location.href = returnUrl;
    } else {
      setIsApplying(false);
    }
  };

  const isUpdate = !!validation?.isRegistered;
  const diff = validation?.diff;
  const hasProblems = !!validation && validation.problems.length > 0;
  const nothingChanges =
    isUpdate &&
    !!diff &&
    !diff.drivesToCreate.length &&
    !diff.circlesToCreate.length &&
    !diff.driveAccessGained.length &&
    !diff.driveAccessLost.length &&
    !diff.permissionKeysGained.length &&
    !diff.permissionKeysLost.length &&
    !diff.authorizedCirclesAdded.length &&
    !diff.authorizedCirclesRemoved.length;

  return (
    <PageShell>
      <h1 className="mb-5 text-4xl dark:text-white">
        {validation ? (isUpdate ? t('Update app') : t('Install app')) : t('App registration')}:
        <small className="block">
          {manifest.name}{' '}
          {manifest.corsHostName ? (
            <>
              (<DomainHighlighter>{manifest.corsHostName}</DomainHighlighter>)
            </>
          ) : null}
        </small>
        <small className="block font-mono text-sm font-normal text-slate-400 dark:text-slate-500">
          /apps/{manifest.appSlug}
        </small>
      </h1>

      {isLoading ? (
        <>
          <LoadingBlock className="my-2 h-12" />
          <LoadingBlock className="my-2 h-32" />
        </>
      ) : null}

      <V2ErrorAlert error={validateError} title={t('Could not check this app')} />

      {validation && diff ? (
        <>
          <p>
            {isUpdate
              ? `"${manifest.name}" ${t('is already installed. Allowing applies these changes')}:`
              : `"${manifest.name}" ${t('is not installed on your identity. Allowing installs it with the following')}:`}
          </p>

          <ProblemsList problems={validation.problems} />

          {nothingChanges ? (
            <SubtleMessage className="my-5">{t('Nothing changes: the app is up to date.')}</SubtleMessage>
          ) : null}

          {diff.drivesToCreate.length || diff.circlesToCreate.length ? (
            <Section title={t('Will create and own')}>
              <div className="flex flex-col gap-4">
                {diff.drivesToCreate.map((drive) => (
                  <OwnedDriveSummary
                    drive={drive}
                    appSlug={manifest.appSlug}
                    key={targetDriveKey(drive.targetDrive)}
                  />
                ))}
                {diff.circlesToCreate.map((circle) => (
                  <OwnedCirclePreview circle={circle} driveName={driveName} key={circle.id} />
                ))}
              </div>
            </Section>
          ) : null}

          {diff.driveAccessGained.length ? (
            <Section title={t('Will gain access to')}>
              <DriveAccessList entries={diff.driveAccessGained} />
            </Section>
          ) : null}

          {diff.driveAccessLost.length ? (
            <Section title={t('Will lose access to')}>
              <DriveAccessList entries={diff.driveAccessLost} />
            </Section>
          ) : null}

          {diff.permissionKeysGained.length ? (
            <Section title={t('Will be allowed to')}>
              <div className="flex flex-col gap-4">
                {diff.permissionKeysGained.map((key) => (
                  <PermissionView permission={key} key={key} />
                ))}
              </div>
            </Section>
          ) : null}

          {diff.permissionKeysLost.length ? (
            <Section title={t('Will no longer be allowed to')}>
              <div className="flex flex-col gap-4 line-through decoration-slate-400">
                {diff.permissionKeysLost.map((key) => (
                  <PermissionView permission={key} key={key} />
                ))}
              </div>
            </Section>
          ) : null}

          {diff.authorizedCirclesAdded.length || diff.authorizedCirclesRemoved.length ? (
            <Section title={t('Circles this app works with')}>
              <div className="flex flex-col gap-2">
                {diff.authorizedCirclesAdded.map((id) => (
                  <p key={`add-${id}`}>
                    <span className="text-green-600">+ </span>
                    {circleName(id)}
                  </p>
                ))}
                {diff.authorizedCirclesRemoved.map((id) => (
                  <p key={`remove-${id}`} className="text-slate-400">
                    <span className="text-red-600">- </span>
                    {circleName(id)}
                  </p>
                ))}
                {manifest.circleMemberPermissionGrant &&
                (manifest.circleMemberPermissionGrant.drives?.length ||
                  manifest.circleMemberPermissionGrant.permissionSet?.keys?.length) ? (
                  <div className="mt-3">
                    <p className="mb-1 text-sm text-slate-400">
                      {t('Members of these circles get, within this app')}:
                    </p>
                    <CircleGrantedDrives
                      grants={manifest.circleMemberPermissionGrant.drives ?? []}
                      driveName={driveName}
                    />
                    {manifest.circleMemberPermissionGrant.permissionSet?.keys?.length ? (
                      <div className="mt-2">
                        <PermissionKeyList keys={manifest.circleMemberPermissionGrant.permissionSet.keys} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Section>
          ) : null}

          {isUpdate && (diff.drivesAlreadyOwned.length || diff.circlesAlreadyOwned.length) ? (
            <p className="my-5 text-sm text-slate-400">
              {t('Already owns')}:{' '}
              {[...diff.drivesAlreadyOwned.map((d) => d.name), ...diff.circlesAlreadyOwned.map((c) => c.name)].join(
                ', '
              )}
            </p>
          ) : null}

          {steps ? <StepList steps={steps} /> : null}

          <div className="mt-8 flex flex-col gap-2 sm:flex-row-reverse">
            <ActionButton
              onClick={() => doAllow(validation)}
              type="primary"
              icon={Arrow}
              state={isApplying ? 'pending' : undefined}
              disabled={hasProblems || isApplying}
            >
              {t('Allow')}
            </ActionButton>
            <ActionButton type="secondary" onClick={doCancel} disabled={isApplying}>
              {t('Cancel')}
            </ActionButton>
          </div>
        </>
      ) : !isLoading ? (
        <div className="mt-8 flex flex-col gap-2 sm:flex-row-reverse">
          <ActionButton type="secondary" onClick={doCancel}>
            {t('Cancel')}
          </ActionButton>
        </div>
      ) : null}
    </PageShell>
  );
};

const StepList = ({ steps }: { steps: Step[] }) => (
  <Section title={t('Progress')}>
    <ul className="flex flex-col gap-2">
      {steps.map((step) => (
        <li key={step.key} className="flex flex-row items-start gap-3">
          <span className="mt-0.5 h-5 w-5 flex-shrink-0">
            {step.status === 'running' ? (
              <Loader className="h-5 w-5" />
            ) : step.status === 'done' ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : step.status === 'error' ? (
              <Exclamation className="h-5 w-5 text-red-600" />
            ) : step.status === 'skipped' ? (
              <Times className="h-5 w-5 text-slate-300" />
            ) : null}
          </span>
          <span className={step.status === 'skipped' ? 'text-slate-400' : ''}>
            {step.label}
            {step.status === 'skipped' ? ` (${t('no changes')})` : ''}
            {step.error ? <small className="block text-red-600">{step.error}</small> : null}
          </span>
        </li>
      ))}
    </ul>
  </Section>
);

export default AppRegistrationV2;
