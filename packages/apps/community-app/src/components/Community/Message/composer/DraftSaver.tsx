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
     }: {
        community: HomebaseFile<CommunityDefinition> | undefined;
        draftKey: string | undefined;
        message: RichText | undefined;
    }) => {
        const queryClient = useQueryClient();
        // Note: I don't know why Stef is handling undefined here, when you walk up the stack
        // there is always a commuity; I mean the draft saver itself makes no sense unless there 
        // is a community. I know it's not random yet can't seem to find the scenario... yet
        const communityId = community?.fileMetadata.appData.uniqueId;
        
        if(!communityId ) {
            console.warn("Draft Saver is missing community 🤯");
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
                communityDrafts && updateCommunityDrafts({drafts: communityDrafts});
            },
            {
                timeoutMillis: 1000,
            }
        );

        const [updatedAt, setUpdatedAt] = useState<number | undefined>(undefined);
        useEffect(() => {
            const drafts = communityDrafts?.fileMetadata.appData.content.drafts || {};
            if (drafts && draftKey && isRichTextEqual(drafts[draftKey]?.message, message)) return;

            setUpdatedAt(new Date().getTime());
        }, [message]);

        useEffect(() => {
            const drafts = communityDrafts?.fileMetadata.appData.content.drafts || {};

            if (communityDrafts && draftKey && updatedAt) {
                if (
                    isRichTextEqual(drafts[draftKey]?.message, message) ||
                    (drafts[draftKey] && drafts[draftKey]?.updatedAt >= updatedAt)
                )
                    return;

                //const emptiedDraft = isEmptyRichText(message) ? [] : message;
                const emptiedDraft = isEmptyRichText(message) ? undefined : message;
                if (drafts[draftKey]?.message === undefined && emptiedDraft === undefined) return;

                const newDrafts: Record<string, Draft | undefined> = {
                    ...drafts,
                    [draftKey]: {
                        message: emptiedDraft,
                        updatedAt: updatedAt || 0,
                    },
                };

                if (message === undefined) {
                    delete newDrafts[draftKey];
                }

                const newCommunityDrafts: NewHomebaseFile<CommunityDrafts> | HomebaseFile<CommunityDrafts> =
                    {
                        ...communityDrafts,
                        fileMetadata: {
                            ...communityDrafts?.fileMetadata,
                            appData: {
                                ...communityDrafts?.fileMetadata.appData,
                                content: {...communityDrafts?.fileMetadata.appData.content, drafts: newDrafts},
                            },
                            versionTag: communityDrafts?.fileMetadata.versionTag,
                        },
                    };

                insertNewCommunityDrafts(
                    queryClient,
                    newCommunityDrafts as HomebaseFile<CommunityDrafts>,
                    communityId
                );
                
                debouncedSave();
                
                //
                // if (isEmptyRichText(message) || message === undefined || message.length === 0) {
                //     insertNewCommunityDrafts(
                //         queryClient,
                //         newCommunityDrafts as HomebaseFile<CommunityDrafts>
                //     );
                //
                //     // console.info("start calling update for empty message", newCommunityDrafts.fileMetadata.versionTag)
                //     updateCommunityDrafts({drafts: newCommunityDrafts});
                //
                //     return;
                // } else {
                //     insertNewCommunityDrafts(
                //         queryClient,
                //         newCommunityDrafts as HomebaseFile<CommunityDrafts>
                //     );
                //     debouncedSave();
                // }
                
            }
        }, [communityDrafts, draftKey, message, debouncedSave]);

        return null;
    },
    (prevProps, nextProps) => {
        return (
            prevProps.draftKey === nextProps.draftKey &&
            prevProps.community?.fileMetadata.appData.uniqueId ===
            nextProps.community?.fileMetadata.appData.uniqueId &&
            prevProps.community?.fileMetadata.senderOdinId ===
            nextProps.community?.fileMetadata.senderOdinId &&
            // Avoid re-rendering if the message is the same
            isRichTextEqual(prevProps.message, nextProps.message)
        );
    }
);

DraftSaver.displayName = 'DraftSaver';
