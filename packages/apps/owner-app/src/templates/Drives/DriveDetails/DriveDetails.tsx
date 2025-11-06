import {useState} from 'react';
import {useParams} from 'react-router-dom';
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
import FileBrowser from '../../../components/Drives/FileBrowser/FileBrowser';
import {
    ActionButton,
    ActionGroup,
    CirclePermissionView,
    t,
    useCircles,
} from '@homebase-id/common-app';
import {HardDrive, Download, HeartBeat, Pencil} from '@homebase-id/common-app/icons';

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
    const {mutateAsync: exportUnencrypted, status: exportStatus} = useExport().exportUnencrypted;

    const {data: circles} = useCircles().fetch;
    const {data: apps} = useApps().fetchRegistered;

    const readOnly = stringGuidsEqual(driveDef?.targetDriveInfo.alias, TRANSIENT_TEMP_DRIVE_ALIAS);

    const [isDriveEditOpen, setIsDriveEditOpen] = useState(false);
    const [isCircleSelectorOpen, setIsCircleSelectorOpen] = useState(false);
    const [isAppSelectorOpen, setIsAppSelectorOpen] = useState(false);
    const [isShowDriveStatus, setIsShowDriveStatus] = useState(false);

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
                            ]}
                            state={exportStatus}
                            type="secondary"
                        />
                    </>
                }
                breadCrumbs={[
                    {href: '/owner/drives', title: 'My Drives'},
                    {title: driveDef.name ?? ''},
                ]}
            />
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
        </>
    );
};

export default DriveDetails;
