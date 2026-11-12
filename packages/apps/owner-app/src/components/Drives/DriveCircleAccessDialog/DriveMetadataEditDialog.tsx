import {DriveDefinition} from '@homebase-id/js-lib/core';
import {useState} from 'react';
import {createPortal} from 'react-dom';
import {Arrow} from '@homebase-id/common-app/icons';
import {
    t,
    ActionButton,
    ActionButtonState,
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
import {sendListingAndSubscriptionChanges} from './sendListingAndSubscriptionChanges';

const dictionariesEqual = (
    a: { [key: string]: string } | undefined,
    b: { [key: string]: string } | undefined
) => {
    const aKeys = Object.keys(a || {});
    const bKeys = Object.keys(b || {});
    return aKeys.length === bKeys.length && aKeys.every((key) => (a || {})[key] === (b || {})[key]);
};

/** One drive option. With `lockedHint` the box is greyed out and can't be changed, and the hint says why. */
const ToggleRow = ({
                       label,
                       hint,
                       lockedHint,
                       checked,
                       onChange,
                   }: {
    label: string;
    hint: string;
    lockedHint?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) => (
    <div
        className={`flex flex-row items-center justify-between gap-2 rounded-lg ${
            lockedHint ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''
        }`}>
        <Label>
            {label}
            <small className="block text-sm text-slate-400">{lockedHint ?? hint}</small>
        </Label>

        <div>
            <CheckboxToggle
                disabled={!!lockedHint}
                checked={checked}
                onChange={(e) => onChange(e.currentTarget.checked)}
            />
        </div>
    </div>
);

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
        editAnonymousRead,
        editAllowSubscriptions,
        editAllowCdn,
        editBlockEnumeration,
        editDescription,
        editAttributes,
        editArchiveStatus,
    } = useDrive();
    const mutations = [
        editAnonymousRead,
        editAllowSubscriptions,
        editAllowCdn,
        editBlockEnumeration,
        editDescription,
        editAttributes,
        editArchiveStatus,
    ];

    const [allowAnonymousReads, setAllowAnonymousReads] = useState(
        driveDefinition.allowAnonymousReads
    );
    const [isArchived, setIsArchived] = useState(
        driveDefinition.isArchived
    );

    const [allowSubscriptions, setAllowSubscriptions] = useState(driveDefinition.allowSubscriptions);
    const [allowCdn, setAllowCdn] = useState(driveDefinition.allowCdn);
    const savedBlockEnumeration = !!driveDefinition.blockEnumeration;
    const [blockEnumeration, setBlockEnumeration] = useState(savedBlockEnumeration);
    const [metadata, setMetadata] = useState(driveDefinition.metadata);
    const [attributes, setAttributes] = useState(driveDefinition.attributes);

    if (!isOpen) return null;

    const isSystemDrive = driveDefinition.isSystemDrive;

    const dialog = (
        <DialogWrapper title={title} onClose={onCancel}>
            <>
                <ErrorNotification error={mutations.find((mutation) => mutation.error)?.error}/>
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
                                editAnonymousRead.mutateAsync({
                                    targetDrive,
                                    newAllowAnonymousRead: allowAnonymousReads,
                                })
                            );

                        pending.push(
                            sendListingAndSubscriptionChanges(
                                allowSubscriptions,
                                allowSubscriptions !== driveDefinition.allowSubscriptions
                                    ? () =>
                                        editAllowSubscriptions.mutateAsync({
                                            targetDrive,
                                            newAllowSubscriptions: allowSubscriptions,
                                        })
                                    : undefined,
                                blockEnumeration !== savedBlockEnumeration
                                    ? () =>
                                        editBlockEnumeration.mutateAsync({
                                            targetDrive,
                                            newBlockEnumeration: blockEnumeration,
                                        })
                                    : undefined
                            )
                        );

                        if (allowCdn !== driveDefinition.allowCdn)
                            pending.push(
                                editAllowCdn.mutateAsync({
                                    targetDrive,
                                    newAllowCdn: allowCdn,
                                })
                            );

                        if (metadata !== driveDefinition.metadata)
                            pending.push(
                                editDescription.mutateAsync({
                                    targetDrive,
                                    newDescription: metadata,
                                })
                            );

                        if (!dictionariesEqual(attributes, driveDefinition.attributes))
                            pending.push(
                                editAttributes.mutateAsync({
                                    targetDrive,
                                    newAttributes: attributes,
                                })
                            );

                        if (!isSystemDrive && isArchived !== driveDefinition.isArchived)
                            pending.push(
                                editArchiveStatus.mutateAsync({
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

                        mutations.forEach((mutation) => mutation.reset());
                        onConfirm();
                    }}
                >
                    <div className="flex flex-col gap-3">
                        <ToggleRow
                            label={t('Allow anonymous reads')}
                            hint={t(
                                'Can the drive be read by anonymous users? Individual files can still be stricter.'
                            )}
                            lockedHint={
                                isSystemDrive ? t('Read mode of system drives cannot be changed.') : undefined
                            }
                            checked={allowAnonymousReads}
                            onChange={setAllowAnonymousReads}
                        />

                        <ToggleRow
                            label={t('Archive Drive')}
                            hint={t(
                                'Is the drive archived? When set, the drive will disappear from everywhere except here. Apps cannot read or write to the drive.'
                            )}
                            lockedHint={isSystemDrive ? t('System drives cannot be archived.') : undefined}
                            checked={isArchived}
                            onChange={setIsArchived}
                        />

                        <ToggleRow
                            label={t('Allow subscriptions')}
                            hint={t(
                                'Can the drive be subscribed to? Subscriptions are used to notify users of new files.'
                            )}
                            lockedHint={
                                isSystemDrive
                                    ? t('Subscription mode of system drives cannot be changed.')
                                    : blockEnumeration
                                        ? t('Turn off "Hide the file list" to allow subscriptions.')
                                        : undefined
                            }
                            checked={allowSubscriptions}
                            onChange={setAllowSubscriptions}
                        />

                        <ToggleRow
                            label={t('Hide the file list')}
                            hint={t("Only you and your apps can list this drive's files. Others need a direct link.")}
                            lockedHint={
                                isSystemDrive
                                    ? t('This setting of system drives cannot be changed.')
                                    : allowSubscriptions
                                        ? t('Turn off "Allow subscriptions" to hide the file list.')
                                        : undefined
                            }
                            checked={blockEnumeration}
                            onChange={setBlockEnumeration}
                        />

                        <ToggleRow
                            label={t('Allow CDN')}
                            hint={t("Allow the CDN to read and cache this drive's payloads and thumbnails.")}
                            checked={allowCdn}
                            onChange={setAllowCdn}
                        />

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
                            state={mutations.reduce<ActionButtonState>(
                                (state, mutation) => mergeStates(state, mutation.status),
                                'idle'
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
