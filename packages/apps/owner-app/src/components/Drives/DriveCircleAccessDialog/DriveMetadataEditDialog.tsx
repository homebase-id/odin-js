import {DriveDefinition} from '@homebase-id/js-lib/core';
import {useEffect, useState} from 'react';
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
            mutate: updateAnonymousRead,
            error: updateAnonymousReadError,
            status: updateAnonymousReadStatus,
            reset: resetAnonymousRead,
        },
        editAllowSubscriptions: {
            mutate: updateAllowSubscription,
            error: updateAllowSubscriptionError,
            status: updateAllowSubscriptionStatus,
            reset: resetAllowSubscription,
        },
        editDescription: {
            mutate: updateDescription,
            error: updateDescriptionError,
            status: updateDescriptionStatus,
            reset: resetDescription,
        },
        editArchiveStatus: {
            mutate: updateDriveArchiveFlag,
            error: updateDriveArchiveFlagError,
            status: updateDriveArchiveFlagStatus,
            reset: resetDriveArchiveFlag,
        },
        editAttributes: {
            mutate: updateAttributes,
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
    const [metadata, setMetadata] = useState(driveDefinition.metadata);
    const [attributes, setAttributes] = useState(driveDefinition.attributes);

    useEffect(() => {
        if (
            updateAnonymousReadStatus === 'success' &&
            updateAllowSubscriptionStatus === 'success' &&
            updateDescriptionStatus === 'success' &&
            updateAttributesStatus === 'success' &&
            updateDriveArchiveFlagStatus === 'success'
        ) {
            resetAnonymousRead();
            resetAllowSubscription();
            resetDescription();
            resetAttributes();
            resetDriveArchiveFlag();
            onConfirm();
        }
    }, [
        updateAnonymousReadStatus,
        updateAllowSubscriptionStatus,
        updateDescriptionStatus,
        updateAttributesStatus,
        updateDriveArchiveFlagStatus
    ]);

    if (!isOpen) return null;

    const dialog = (
        <DialogWrapper title={title} onClose={onCancel}>
            <>
                <ErrorNotification
                    error={
                        updateAnonymousReadError ||
                        updateAllowSubscriptionError ||
                        updateDescriptionError ||
                        updateAttributesError ||
                        updateDriveArchiveFlagError
                    }
                />
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        updateAnonymousRead({
                            targetDrive: driveDefinition.targetDriveInfo,
                            newAllowAnonymousRead: allowAnonymousReads,
                        });

                        updateAllowSubscription({
                            targetDrive: driveDefinition.targetDriveInfo,
                            newAllowSubscriptions: allowSubscriptions,
                        });

                        updateDescription({
                            targetDrive: driveDefinition.targetDriveInfo,
                            newDescription: metadata,
                        });

                        updateAttributes({
                            targetDrive: driveDefinition.targetDriveInfo,
                            newAttributes: attributes,
                        });

                        if(!driveDefinition.isSystemDrive) {
                            updateDriveArchiveFlag({
                                targetDrive: driveDefinition.targetDriveInfo,
                                newArchived: isArchived
                            });
                        }

                        return false;
                    }}
                >
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-row items-center justify-between gap-2">
                            <Label>
                                {t('Allow anonymous reads')}
                                <small className="block text-sm text-slate-400">
                                    {t(
                                        'Can the drive be read by anonymous users? Individual files can still be stricter.'
                                    )}
                                </small>
                            </Label>

                            <div>
                                <CheckboxToggle
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

                        {/*<div className="flex flex-row items-center justify-between gap-2">*/}
                        {/*    <Label>*/}
                        {/*        {t('Archive Drive')}*/}
                        {/*        <small className="block text-sm text-slate-400">*/}
                        {/*            {t(*/}
                        {/*                'Is the drive archived?  When set, the drive will disappear from every where except here.  Apps cannot read or write to the drive.'*/}
                        {/*            )}*/}
                        {/*        </small>*/}
                        {/*    </Label>*/}

                        {/*    <div>*/}
                        {/*        <CheckboxToggle*/}
                        {/*            disabled={driveDefinition.isSystemDrive}*/}
                        {/*            defaultChecked={driveDefinition.isArchived}*/}
                        {/*            onChange={(e) => setIsArchived(e.currentTarget.checked)}*/}
                        {/*        />*/}
                        {/*    </div>*/}
                        {/*</div>*/}

                        <div className="flex flex-row items-center justify-between gap-2">
                            <Label>
                                {t('Allow subscriptions')}
                                <small className="block text-sm text-slate-400">
                                    {t(
                                        'Can the drive be subscribed to? Subscriptions are used to notify users of new files.'
                                    )}
                                </small>
                            </Label>

                            <div>
                                <CheckboxToggle
                                    defaultChecked={driveDefinition.allowSubscriptions}
                                    onChange={(e) => setAllowSubscriptions(e.currentTarget.checked)}
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
                            state={mergeStates(updateAnonymousReadStatus, updateDescriptionStatus)}
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
