import {isEmptyRichText, isRichTextEqual, useDebounce} from '@homebase-id/common-app';
import {HomebaseFile, RichText, NewHomebaseFile} from '@homebase-id/js-lib/core';
import {useState, useEffect, memo} from 'react';
import {CommunityDefinition} from '../../../../providers/CommunityDefinitionProvider';
import {Draft} from '../../../../providers/CommunityMetadataProvider';
import {useQueryClient} from '@tanstack/react-query';
import {
    insertNewCommunityDrafts,
    useCommunityDrafts,
} from '../../../../hooks/community/useCommunityDrafts';
import {CommunityDrafts} from '../../../../providers/CommunityDraftsProvider';

export const DraftSaver = memo(
    ({
         community,
         draftKey,
         message,
         isSent,
     }: {
        community: HomebaseFile<CommunityDefinition> | undefined;
        draftKey: string | undefined;
        message: RichText | undefined;
        isSent?: boolean;
    }) => {
        const queryClient = useQueryClient();
        const communityId = community?.fileMetadata.appData.uniqueId;

        if (!communityId) {
            console.warn('DraftSaver is missing community 🤯');
            return null;
        }

        const {
            single: {data: communityDrafts},
            update: {mutate: updateCommunityDrafts},
        } = useCommunityDrafts({
            odinId: community?.fileMetadata.senderOdinId,
            communityId: communityId,
        });

        const debouncedSave = useDebounce(
            () => {
                if (communityDrafts && !isSent) {
                    updateCommunityDrafts({drafts: communityDrafts});
                }
            },
            {timeoutMillis: 1000}
        );

        const [updatedAt, setUpdatedAt] = useState<number>(new Date().getTime()); // Initialize with current timestamp

        useEffect(() => {
            if (isSent || !draftKey || !communityDrafts || !message) {
                return;
            }

            const drafts = communityDrafts.fileMetadata.appData.content.drafts || {};
            const currentDraft = drafts[draftKey];

            if (!isRichTextEqual(currentDraft?.message, message)) {
                setUpdatedAt(new Date().getTime());
            }
        }, [message, draftKey, communityDrafts, isSent]);

        const debouncedDraftUpdate = useDebounce(() => {
            if (!communityDrafts || !draftKey || isSent) {
                return;
            }

            const drafts = communityDrafts.fileMetadata.appData.content.drafts || {};
            const currentDraft = drafts[draftKey];

            if (
                isRichTextEqual(currentDraft?.message, message) ||
                (currentDraft?.updatedAt && currentDraft.updatedAt >= updatedAt)
            ) {
                return;
            }

            const emptiedDraft = isEmptyRichText(message) || message === undefined ? undefined : message;

            if (currentDraft?.message === undefined && emptiedDraft === undefined) {
                return;
            }

            const newDrafts: Record<string, Draft | undefined> = {
                ...drafts,
                [draftKey]: emptiedDraft ? {message: emptiedDraft, updatedAt} : undefined,
            };

            if (!emptiedDraft) {
                delete newDrafts[draftKey];
            }

            const newCommunityDrafts: HomebaseFile<CommunityDrafts> | NewHomebaseFile<CommunityDrafts> = {
                ...communityDrafts,
                fileMetadata: {
                    ...communityDrafts.fileMetadata,
                    appData: {
                        ...communityDrafts.fileMetadata.appData,
                        content: {
                            ...communityDrafts.fileMetadata.appData.content,
                            drafts: newDrafts,
                        },
                    },
                    versionTag: communityDrafts.fileMetadata.versionTag,
                },
            };

            insertNewCommunityDrafts(queryClient, newCommunityDrafts as HomebaseFile<CommunityDrafts>, communityId);

            if (emptiedDraft) {
                debouncedSave();
            } else {
                updateCommunityDrafts({drafts: newCommunityDrafts});
            }
        }, {timeoutMillis: 1000});

        useEffect(() => {
            debouncedDraftUpdate();
        }, [communityDrafts, draftKey, message, updatedAt, debouncedSave, communityId, isSent, debouncedDraftUpdate]);

        // New effect to clear draft after send
        useEffect(() => {
            if (isSent && communityDrafts && draftKey) {
                const drafts = communityDrafts.fileMetadata.appData.content.drafts || {};
                if (drafts[draftKey]) {
                    const newDrafts: Record<string, Draft | undefined> = {...drafts};
                    delete newDrafts[draftKey];

                    const newCommunityDrafts: HomebaseFile<CommunityDrafts> | NewHomebaseFile<CommunityDrafts> = {
                        ...communityDrafts,
                        fileMetadata: {
                            ...communityDrafts.fileMetadata,
                            appData: {
                                ...communityDrafts.fileMetadata.appData,
                                content: {
                                    ...communityDrafts.fileMetadata.appData.content,
                                    drafts: newDrafts,
                                },
                            },
                            versionTag: communityDrafts.fileMetadata.versionTag,
                        },
                    };

                    insertNewCommunityDrafts(queryClient, newCommunityDrafts as HomebaseFile<CommunityDrafts>, communityId);
                    updateCommunityDrafts({drafts: newCommunityDrafts});
                }
            }
        }, [isSent, communityDrafts, draftKey, communityId, queryClient, updateCommunityDrafts]);

        return null;
    },
    (prevProps, nextProps) => {
        return (
            prevProps.draftKey === nextProps.draftKey &&
            prevProps.community?.fileMetadata.appData.uniqueId ===
            nextProps.community?.fileMetadata.appData.uniqueId &&
            prevProps.community?.fileMetadata.senderOdinId ===
            nextProps.community?.fileMetadata.senderOdinId &&
            prevProps.isSent === nextProps.isSent &&
            isRichTextEqual(prevProps.message, nextProps.message)
        );
    }
);

DraftSaver.displayName = 'DraftSaver';