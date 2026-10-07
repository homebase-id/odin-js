import {useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {useOwnerAppName} from '../../../hooks/apps/useOwnerAppName';
import {useDrive} from '../../../hooks/drives/useDrive';
import Section from '../../../components/ui/Sections/Section';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import {useExport} from '../../../hooks/drives/useExport';
import AppMembershipView from '../../../components/PermissionViews/AppPermissionView/AppPermissionView';
import {useApps} from '../../../hooks/apps/useApps';
import {PageMeta} from '@homebase-id/common-app';
import {
    drivesEqual,
    getDrivePermissionFromNumber,
    stringGuidsEqual,
} from '@homebase-id/js-lib/helpers';
import {TRANSIENT_TEMP_DRIVE_ALIAS} from '@homebase-id/js-lib/core';
import DriveAppAccessDialog from '../../../components/Drives/DriveAppAccessDialog/DriveAppAccessDialog';
import DriveCircleAccessDialog from '../../../components/Drives/DriveCircleAccessDialog/DriveCircleAccessDialog';
import DriveMetadataEditDialog from '../../../components/Drives/DriveCircleAccessDialog/DriveMetadataEditDialog';
import {DriveStatusDialog} from '../../../components/Drives/DriveStatusDialog/DriveStatusDialog';
import {SetOwningAppDialog} from '../../../components/Apps/SetOwningAppDialog/SetOwningAppDialog';
import {ReassignOwningAppDialog} from '../../../components/Apps/SetOwningAppDialog/ReassignOwningAppDialog';
import FileBrowser from '../../../components/Drives/FileBrowser/FileBrowser';
import {DrivePurgeStatus} from '../../../components/Drives/DrivePurgeStatus/DrivePurgeStatus';
import {
    ActionButton,
    ActionGroup,
    ErrorNotification,
    CirclePermissionView,
    t,
    useCircles,
  getOwnerAppPath,
} from '@homebase-id/common-app';
import {HardDrive, Download, HeartBeat, Pencil, Trash} from '@homebase-id/common-app/icons';

const DriveDetails = () => {
    const {driveKey} = useParams();
    const splittedDriveKey = driveKey ? driveKey.split('_') : undefined;
    const {
        fetch: {data: driveDef, isLoading: driveDefLoading},
    } = useDrive({
        targetDrive: splittedDriveKey
            ? {alias: splittedDriveKey[0], type: splittedDriveKey[1]}
            : undefined,
    });
    const appName = useOwnerAppName(driveDef?.appId ?? undefined);
    const {mutateAsync: exportUnencrypted, status: exportStatus} = useExport().exportUnencrypted;
    const {
        setOwningApp: {mutateAsync: setOwningApp},
        reassignOwningApp: {mutateAsync: reassignOwningApp},
        emptyDrive: {mutateAsync: emptyDrive, status: emptyStatus, error: emptyError},
        deleteDrive: {mutateAsync: deleteDrive, status: deleteStatus, error: deleteError},
    } = useDrive();
    const navigate = useNavigate();

    const {data: circles} = useCircles().fetch;
    const {data: apps} = useApps().fetchRegistered;

    const readOnly = stringGuidsEqual(driveDef?.targetDriveInfo.alias, TRANSIENT_TEMP_DRIVE_ALIAS);

    const [isDriveEditOpen, setIsDriveEditOpen] = useState(false);
    const [isCircleSelectorOpen, setIsCircleSelectorOpen] = useState(false);
    const [isAppSelectorOpen, setIsAppSelectorOpen] = useState(false);
    const [isShowDriveStatus, setIsShowDriveStatus] = useState(false);
    const [isSetOwningAppOpen, setIsSetOwningAppOpen] = useState(false);
    const [isReassignOwningAppOpen, setIsReassignOwningAppOpen] = useState(false);

    if (driveDefLoading) return <LoadingDetailPage/>;

    if (!driveDef) return <>{t('No matching drive found')}</>;

    const targetDriveInfo = driveDef?.targetDriveInfo;

    const circlesWithAGrantOnThis = circles?.filter((circle) =>
        circle.driveGrants?.some((grant) => drivesEqual(grant.permissionedDrive.drive, targetDriveInfo))
    );

    const appsWithAGrantOnThis = apps?.filter((app) =>
        app.grant.driveGrants.some((grant) =>
            drivesEqual(grant.permissionedDrive.drive, targetDriveInfo)
        )
    );

    // Ownership, not access: the app this drive belongs to, which is what supplies the first half
    // of its wire address. An app can hold a grant on a drive it does not own, and vice versa.
    const owningApp = driveDef.appId
        ? apps?.find((app) => stringGuidsEqual(app.appId, driveDef.appId ?? undefined))
        : undefined;

    // Both slugs have to be there for the address to resolve on the other end.
    const wireAddress =
        owningApp?.appSlug && driveDef.driveSlug
            ? `/apps/${owningApp.appSlug}/drives/${driveDef.driveSlug}`
            : undefined;

    const doDownload = (url: string) => {
        // Dirty hack for easy download
        const link = document.createElement('a');
        link.href = url;
        link.download = url.substring(url.lastIndexOf('/') + 1);
        link.click();
    };

    // console.log('dd', driveDef)
    return (
        <>
            <PageMeta
                icon={HardDrive}
                title={`${driveDef.name}`}
                actions={
                    <>
                        <ActionGroup
                            options={[
                                {
                                    label: 'Export',
                                    icon: Download,
                                    onClick: async () => doDownload(await exportUnencrypted(driveDef)),
                                },
                                {
                                    label: 'Drive Status',
                                    icon: HeartBeat,
                                    onClick: () => setIsShowDriveStatus(true),
                                },
                                // Archiving first is the first "are you sure": the server deletes only an archived
                                // drive, and it never archives a system drive, so neither action is offered on one.
                                ...(driveDef.isArchived && !readOnly
                                    ? [
                                          {
                                              label: t('Empty drive'),
                                              icon: Trash,
                                              onClick: () => emptyDrive({targetDrive: targetDriveInfo}),
                                              confirmOptions: purgeConfirm(t('empty'), t('Empty drive'), t('Empty'), driveDef.name, [
                                                  `${t('Every file on')} ${driveDef.name} ${t('is deleted, with its payloads. The drive itself stays.')}`,
                                                  t('This runs in the background: on a large drive, files disappear over the next minutes. Files you add after confirming are kept.'),
                                              ]),
                                          },
                                          {
                                              label: t('Delete drive'),
                                              icon: Trash,
                                              onClick: async () => {
                                                  await deleteDrive({targetDrive: targetDriveInfo});
                                                  navigate(getOwnerAppPath(driveDef.appId));
                                              },
                                              confirmOptions: purgeConfirm(t('delete'), t('Delete drive'), t('Delete'), driveDef.name, [
                                                  `${driveDef.name} ${t('is deleted with every file on it, and every circle and app loses its access to it.')}`,
                                                  t('The drive disappears at once; its files are removed in the background, and a new drive cannot reuse its address until they are.'),
                                              ]),
                                          },
                                      ]
                                    : []),
                            ]}
                            state={[emptyStatus, deleteStatus].find((status) => status === 'pending') ?? exportStatus}
                            type="secondary"
                        />
                    </>
                }
                breadCrumbs={[
                    {href: '/owner/apps', title: 'My apps'},
                    {href: getOwnerAppPath(driveDef.appId), title: appName ?? ''},
                    {title: driveDef.name ?? ''},
                ]}
            />
            <ErrorNotification error={emptyError || deleteError}/>
            <DrivePurgeStatus driveAlias={targetDriveInfo.alias} className="mb-5"/>
            <Section
                title={t('Metadata')}
                actions={
                    !readOnly && (
                        <ActionButton type="mute" onClick={() => setIsDriveEditOpen(true)} icon={Pencil}/>
                    )
                }
            >
                <p className="mb-2">{driveDef.metadata}</p>
                <ul>
                    {driveDef.allowAnonymousReads ? <li>{t('Allow Anonymous Reads')}</li> : null}

                    {/* BE is never reporting allowSubscriptions */}
                    {driveDef.allowSubscriptions ? <li>{t('Allow subscriptions')}</li> : null}
                    {driveDef.allowCdn ? <li>{t('Allow CDN')}</li> : null}
                    {driveDef.isArchived ? <li>{t('Drive is Archived')}</li> : null}
                    {driveDef.ownerOnly ? <li>{t('Owner only')}</li> : null}
                    {driveDef?.attributes ? (
                        <>
                            {Object.keys(driveDef.attributes).map((attrKey) => (
                                <li key={attrKey}>
                                    {attrKey}: {driveDef.attributes[attrKey]}
                                </li>
                            ))}
                        </>
                    ) : null}
                    <li className="my-3 border-b border-slate-200 dark:border-slate-800"></li>
                    <li>Id: {driveDef.targetDriveInfo.alias}</li>
                    <li>Type: {driveDef.targetDriveInfo.type}</li>
                    <li>Slug: {driveDef.driveSlug || t('None')}</li>
                    <li>Type slug: {driveDef.driveTypeSlug || t('None')}</li>
                    <li>
                        {t('Owned by')}:{' '}
                        {driveDef.appId ? (
                            owningApp ? (
                                <>
                                    <Link
                                        to={`/owner/apps/${encodeURIComponent(driveDef.appId)}`}
                                        className="hover:underline"
                                    >
                                        {owningApp.name}
                                    </Link>
                                    <span className="text-slate-400">{` ${t('(app)')}`}</span>
                                    {!driveDef.isSystemDrive && !readOnly ? (
                                        <ReassignLink onClick={() => setIsReassignOwningAppOpen(true)}/>
                                    ) : null}
                                </>
                            ) : (
                                <>
                                    <span className="break-all font-mono">{driveDef.appId}</span>
                                    <span className="text-slate-400">
                                        {` ${t('(app, no longer registered)')}`}
                                    </span>
                                    {!driveDef.isSystemDrive && !readOnly ? (
                                        <ReassignLink onClick={() => setIsReassignOwningAppOpen(true)}/>
                                    ) : null}
                                </>
                            )
                        ) : (
                            <span className="inline-flex flex-row flex-wrap items-center gap-2">
                                {t('No app owns this drive')}
                                {/* Only offered while it is still possible: ownership is set once
                                    and never moved, and a provisioned drive is refused outright
                                    because it is provisioning's to stamp. */}
                                {!driveDef.isSystemDrive && !readOnly ? (
                                    <button
                                        type="button"
                                        className="text-primary hover:underline"
                                        onClick={() => setIsSetOwningAppOpen(true)}
                                    >
                                        {t('Assign to an app')}
                                    </button>
                                ) : null}
                            </span>
                        )}
                    </li>
                    {/* The wire address a remote caller uses. Both halves live in different
                        places -- the app's slug and the drive's -- so the address itself is
                        never visible unless it is assembled here. */}
                    {wireAddress ? (
                        <li>
                            {t('Address')}:{' '}
                            <span className="break-all font-mono">{wireAddress}</span>
                        </li>
                    ) : null}
                    <li>
                        {/* The public half only; the private half is escrowed under the drive's
                            storage key and never leaves the identity host. Shown by fingerprint,
                            with the JWK behind a disclosure -- it is long enough to swamp the list. */}
                        Public key:{' '}
                        {driveDef.writeOnlyPublicKeyJwk ? (
                            <>
                                CRC{' '}
                                <span className="font-mono">
                                    {driveDef.writeOnlyPublicKeyCrc32 ?? t('Unknown')}
                                </span>
                                <details className="mt-1">
                                    <summary className="cursor-pointer text-slate-400 dark:text-slate-500">
                                        {t('Show key')}
                                    </summary>
                                    <span className="block break-all font-mono text-xs text-slate-500 dark:text-slate-400">
                                        {driveDef.writeOnlyPublicKeyJwk}
                                    </span>
                                </details>
                            </>
                        ) : (
                            t('None')
                        )}
                    </li>
                </ul>
            </Section>

            {circlesWithAGrantOnThis?.length ? (
                <Section
                    title={t('Circles with access:')}
                    actions={
                        !readOnly && (
                            <ActionButton
                                type="mute"
                                onClick={() => setIsCircleSelectorOpen(true)}
                                icon={Pencil}
                            />
                        )
                    }
                >
                    <ul className="flex flex-col items-start gap-4">
                        {circlesWithAGrantOnThis.map((circle) => {
                            const matchingGrants = circle.driveGrants?.filter((grant) =>
                                drivesEqual(grant.permissionedDrive.drive, targetDriveInfo)
                            );

                            const matchingGrant = matchingGrants?.reduce(
                                (prev, current) =>
                                    !prev ||
                                    current.permissionedDrive.permission.length >
                                    prev.permissionedDrive.permission.length
                                        ? current
                                        : prev,
                                matchingGrants[0]
                            );

                            return (
                                <CirclePermissionView
                                    circleDef={circle}
                                    key={circle.id}
                                    permissionDetails={t(
                                        getDrivePermissionFromNumber(matchingGrant?.permissionedDrive?.permission)
                                    )}
                                />
                            );
                        })}
                    </ul>
                </Section>
            ) : null}

            {appsWithAGrantOnThis?.length ? (
                <Section
                    title={t('Apps with access:')}
                    actions={
                        !readOnly && (
                            <ActionButton type="mute" onClick={() => setIsAppSelectorOpen(true)} icon={Pencil}/>
                        )
                    }
                >
                    <ul className="flex flex-col items-start gap-4">
                        {appsWithAGrantOnThis.map((app) => {
                            const matchingGrant = app.grant.driveGrants.find(
                                (grant) =>
                                    grant.permissionedDrive.drive.alias === targetDriveInfo.alias &&
                                    grant.permissionedDrive.drive.type === targetDriveInfo.type
                            );
                            return (
                                <AppMembershipView
                                    appDef={app}
                                    key={app.appId}
                                    permissionLevel={t(
                                        getDrivePermissionFromNumber(matchingGrant?.permissionedDrive.permission)
                                    )}
                                />
                            );
                        })}
                    </ul>
                </Section>
            ) : null}

            <FileBrowser targetDrive={targetDriveInfo} systemFileType="Standard" key="Standard"/>
            <FileBrowser targetDrive={targetDriveInfo} systemFileType="Comment" key="Comment"/>

            <DriveMetadataEditDialog
                driveDefinition={driveDef}
                isOpen={isDriveEditOpen}
                onCancel={() => setIsDriveEditOpen(false)}
                onConfirm={() => setIsDriveEditOpen(false)}
                title={`${t('Edit metadata')} ${driveDef.name}`}
            />

            <DriveCircleAccessDialog
                driveDefinition={driveDef}
                isOpen={isCircleSelectorOpen}
                onCancel={() => setIsCircleSelectorOpen(false)}
                onConfirm={() => setIsCircleSelectorOpen(false)}
                title={`${t('Edit access on')} ${driveDef.name}`}
            />

            <DriveAppAccessDialog
                driveDefinition={driveDef}
                isOpen={isAppSelectorOpen}
                onCancel={() => setIsAppSelectorOpen(false)}
                onConfirm={() => setIsAppSelectorOpen(false)}
                title={`${t('Edit access on')} ${driveDef.name}`}
            />

            <DriveStatusDialog
                targetDrive={targetDriveInfo}
                isOpen={isShowDriveStatus}
                onClose={() => setIsShowDriveStatus(false)}
            />

            <SetOwningAppDialog
                title={`${t('Assign')} "${driveDef.name}" ${t('to an app')}`}
                subject="drive"
                isOpen={isSetOwningAppOpen}
                showSlugFields={true}
                existingDriveSlug={driveDef.driveSlug}
                existingDriveTypeSlug={driveDef.driveTypeSlug}
                onCancel={() => setIsSetOwningAppOpen(false)}
                onConfirm={async (appId, driveSlug, driveTypeSlug) => {
                    await setOwningApp({
                        targetDrive: targetDriveInfo,
                        appId: appId,
                        driveSlug: driveSlug,
                        driveTypeSlug: driveTypeSlug,
                    });
                    setIsSetOwningAppOpen(false);
                }}
            />

            <ReassignOwningAppDialog
                title={`${t('Reassign')} "${driveDef.name}"`}
                subject={t('drive')}
                isOpen={isReassignOwningAppOpen}
                currentAppName={owningApp?.name}
                requireSlug={true}
                currentDriveSlug={driveDef.driveSlug}
                onCancel={() => setIsReassignOwningAppOpen(false)}
                onConfirm={async (appId, driveSlug, driveTypeSlug) => {
                    await reassignOwningApp({
                        targetDrive: targetDriveInfo,
                        appId: appId,
                        driveSlug: driveSlug as string,
                        driveTypeSlug: driveTypeSlug,
                    });
                    setIsReassignOwningAppOpen(false);
                }}
            />
        </>
    );
};

/**
 * The confirmation for emptying or deleting a drive: the action's own lines, the closing lines both share, and
 * "<verb> <drive>" to type before the button enables.
 */
const purgeConfirm = (verb: string, title: string, buttonText: string, driveName: string, lines: string[]) => ({
    type: 'critical' as const,
    title,
    buttonText,
    body: [
        ...lines,
        t('To keep the files, cancel and use Export first.'),
        t('Copies your connections already received stay with them. This cannot be undone.'),
    ].join('\n\n'),
    trickQuestion: {
        question: `${t('To confirm, type')} "${verb} ${driveName}":`,
        answer: `${verb} ${driveName}`,
    },
});

/** The way out of an ownership that is already set. Understated on purpose -- it is the escape
    hatch, not something to invite. */
const ReassignLink = ({onClick}: { onClick: () => void }) => (
    <button type="button" className="ml-2 text-sm text-slate-400 hover:underline" onClick={onClick}>
        {t('Change')}
    </button>
);

export default DriveDetails;
