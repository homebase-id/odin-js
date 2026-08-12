import {DriveDefinition} from '@homebase-id/js-lib/core';
import {useState} from 'react';
import {createPortal} from 'react-dom';
import {Arrow} from '@homebase-id/common-app/icons';
import {
    t,
    ActionButton,
    usePortal,
    Label,
    CheckboxToggle,
    mergeStates,
    Input,
    DictionaryEditor,
} from '@homebase-id/common-app';
import {ErrorNotification} from '@homebase-id/common-app';
import {DialogWrapper} from '@homebase-id/common-app';
import {useDrive} from '../../../hooks/drives/useDrive';

const dictionariesEqual = (
    a: { [key: string]: string } | undefined,
    b: { [key: string]: string } | undefined
) => {
    const aKeys = Object.keys(a || {});
    const bKeys = Object.keys(b || {});
    return aKeys.length === bKeys.length && aKeys.every((key) => (a || {})[key] === (b || {})[key]);
};

const DriveMetadataEditDialog = ({
                                     title,
                                     confirmText,

                                     isOpen,
                                     driveDefinition,

                                     onConfirm,
                                     onCancel,
                                 }: {
    title: string;
    confirmText?: string;

    isOpen: boolean;
    driveDefinition: DriveDefinition;

    onConfirm: () => void;
    onCancel: () => void;
}) => {
    const target = usePortal('modal-container');
    const {
        editAnonymousRead: {
            mutateAsync: updateAnonymousRead,
            error: updateAnonymousReadError,
            status: updateAnonymousReadStatus,
            reset: resetAnonymousRead,
        },
        editAllowSubscriptions: {
            mutateAsync: updateAllowSubscription,
            error: updateAllowSubscriptionError,
            status: updateAllowSubscriptionStatus,
            reset: resetAllowSubscription,
        },
        editAllowCdn: {
            mutateAsync: updateAllowCdn,
            error: updateAllowCdnError,
            status: updateAllowCdnStatus,
            reset: resetAllowCdn,
        },
        editDescription: {
            mutateAsync: updateDescription,
            error: updateDescriptionError,
            status: updateDescriptionStatus,
            reset: resetDescription,
        },
        editArchiveStatus: {
            mutateAsync: updateDriveArchiveFlag,
            error: updateDriveArchiveFlagError,
            status: updateDriveArchiveFlagStatus,
            reset: resetDriveArchiveFlag,
        },
        editAttributes: {
            mutateAsync: updateAttributes,
            error: updateAttributesError,
            status: updateAttributesStatus,
            reset: resetAttributes,
        },
    } = useDrive();

    const [allowAnonymousReads, setAllowAnonymousReads] = useState(
        driveDefinition.allowAnonymousReads
    );
    const [isArchived, setIsArchived] = useState(
        driveDefinition.isArchived
    );

    const [allowSubscriptions, setAllowSubscriptions] = useState(driveDefinition.allowSubscriptions);
    const [allowCdn, setAllowCdn] = useState(driveDefinition.allowCdn);
    const [metadata, setMetadata] = useState(driveDefinition.metadata);
    const [attributes, setAttributes] = useState(driveDefinition.attributes);

    if (!isOpen) return null;

    const dialog = (
        <DialogWrapper title={title} onClose={onCancel}>
            <>
                <ErrorNotification
                    error={
                        updateAnonymousReadError ||
                        updateAllowSubscriptionError ||
                        updateAllowCdnError ||
                        updateDescriptionError ||
                        updateAttributesError ||
                        updateDriveArchiveFlagError
                    }
                />
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const targetDrive = driveDefinition.targetDriveInfo;

                        // Only send what actually changed. System drives reject read-mode,
                        // subscription and archive changes outright (403), so firing every
                        // mutation unconditionally would fail the whole save even when the
                        // only change is one the server allows (e.g. allowCdn).
                        const pending: Promise<unknown>[] = [];

                        if (allowAnonymousReads !== driveDefinition.allowAnonymousReads)
                            pending.push(
                                updateAnonymousRead({
                                    targetDrive,
                                    newAllowAnonymousRead: allowAnonymousReads,
                                })
                            );

                        if (allowSubscriptions !== driveDefinition.allowSubscriptions)
                            pending.push(
                                updateAllowSubscription({
                                    targetDrive,
                                    newAllowSubscriptions: allowSubscriptions,
                                })
                            );

                        if (allowCdn !== driveDefinition.allowCdn)
                            pending.push(
                                updateAllowCdn({
                                    targetDrive,
                                    newAllowCdn: allowCdn,
                                })
                            );

                        if (metadata !== driveDefinition.metadata)
                            pending.push(
                                updateDescription({
                                    targetDrive,
                                    newDescription: metadata,
                                })
                            );

                        if (!dictionariesEqual(attributes, driveDefinition.attributes))
                            pending.push(
                                updateAttributes({
                                    targetDrive,
                                    newAttributes: attributes,
                                })
                            );

                        if (!driveDefinition.isSystemDrive && isArchived !== driveDefinition.isArchived)
                            pending.push(
                                updateDriveArchiveFlag({
                                    targetDrive,
                                    newArchived: isArchived,
                                })
                            );

                        try {
                            await Promise.all(pending);
                        } catch {
                            // Errors surface via the mutations' error states above
                            return;
                        }

                        resetAnonymousRead();
                        resetAllowSubscription();
                        resetAllowCdn();
                        resetDescription();
                        resetAttributes();
                        resetDriveArchiveFlag();
                        onConfirm();
                    }}
                >
                    <div className="flex flex-col gap-3">
                        <div
                            className={`flex flex-row items-center justify-between gap-2 rounded-lg ${
                                driveDefinition.isSystemDrive
                                    ? 'opacity-50 cursor-not-allowed bg-slate-50'
                                    : ''
                            }`}>
                            <Label>
                                {t('Allow anonymous reads')}
                                <small className="block text-sm text-slate-400">
                                    {driveDefinition.isSystemDrive
                                        ? t('Read mode of system drives cannot be changed.')
                                        : t(
                                            'Can the drive be read by anonymous users? Individual files can still be stricter.'
                                        )}
                                </small>
                            </Label>

                            <div>
                                <CheckboxToggle
                                    disabled={driveDefinition.isSystemDrive}
                                    defaultChecked={driveDefinition.allowAnonymousReads}
                                    onChange={(e) => setAllowAnonymousReads(e.currentTarget.checked)}
                                />
                            </div>
                        </div>

                        <div
                            className={`flex flex-row items-center justify-between gap-2 rounded-lg ${
                                driveDefinition.isSystemDrive
                                    ? 'opacity-50 cursor-not-allowed bg-slate-50'
                                    : ''
                            }`}>
                            <Label>
                                {t('Archive Drive')}
                                <small className="block text-sm text-slate-400">
                                    {driveDefinition.isSystemDrive
                                        ? t('System drives cannot be archived.')
                                        : t(
                                            'Is the drive archived? When set, the drive will disappear from everywhere except here. Apps cannot read or write to the drive.'
                                        )}
                                </small>
                            </Label>

                            <div>
                                <CheckboxToggle
                                    disabled={driveDefinition.isSystemDrive}
                                    defaultChecked={driveDefinition.isArchived}
                                    onChange={(e) => setIsArchived(e.currentTarget.checked)}
                                />
                            </div>
                        </div>

                        <div
                            className={`flex flex-row items-center justify-between gap-2 rounded-lg ${
                                driveDefinition.isSystemDrive
                                    ? 'opacity-50 cursor-not-allowed bg-slate-50'
                                    : ''
                            }`}>
                            <Label>
                                {t('Allow subscriptions')}
                                <small className="block text-sm text-slate-400">
                                    {driveDefinition.isSystemDrive
                                        ? t('Subscription mode of system drives cannot be changed.')
                                        : t(
                                            'Can the drive be subscribed to? Subscriptions are used to notify users of new files.'
                                        )}
                                </small>
                            </Label>

                            <div>
                                <CheckboxToggle
                                    disabled={driveDefinition.isSystemDrive}
                                    defaultChecked={driveDefinition.allowSubscriptions}
                                    onChange={(e) => setAllowSubscriptions(e.currentTarget.checked)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-row items-center justify-between gap-2">
                            <Label>
                                {t('Allow CDN')}
                                <small className="block text-sm text-slate-400">
                                    {t(
                                        "Allow the CDN to read and cache this drive's payloads and thumbnails."
                                    )}
                                </small>
                            </Label>

                            <div>
                                <CheckboxToggle
                                    defaultChecked={driveDefinition.allowCdn}
                                    onChange={(e) => setAllowCdn(e.currentTarget.checked)}
                                />
                            </div>
                        </div>

                        <div>
                            <Label>{t('Metadata')}</Label>
                            <Input
                                defaultValue={driveDefinition.metadata}
                                onChange={(e) => setMetadata(e.currentTarget.value)}
                            />
                        </div>

                        <div>
                            <Label>{t('Attributes')}</Label>
                            <DictionaryEditor
                                defaultValue={attributes}
                                onChange={(newRecords) => setAttributes(newRecords)}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
                        <ActionButton
                            icon={Arrow}
                            state={mergeStates(
                                mergeStates(updateAnonymousReadStatus, updateAllowSubscriptionStatus),
                                mergeStates(
                                    mergeStates(updateAllowCdnStatus, updateDescriptionStatus),
                                    mergeStates(updateAttributesStatus, updateDriveArchiveFlagStatus)
                                )
                            )}
                        >
                            {confirmText || t('Save')}
                        </ActionButton>
                        <ActionButton
                            type="secondary"
                            onClick={(e) => {
                                e.preventDefault();
                                onCancel();
                            }}
                        >
                            {t('Cancel')}
                        </ActionButton>
                    </div>
                </form>
            </>
        </DialogWrapper>
    );

    return createPortal(dialog, target);
};

export default DriveMetadataEditDialog;
