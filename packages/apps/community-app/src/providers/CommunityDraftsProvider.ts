import {
    DEFAULT_PAYLOAD_KEY,
    DotYouClient,
    getContentFromHeaderOrPayload,
    getFileHeaderByUniqueId,
    HomebaseFile,
    MAX_HEADER_CONTENT_BYTES,
    NewHomebaseFile,
    patchFile,
    PayloadFile,
    RichText,
    SecurityGroupType,
    TargetDrive,
    UpdateLocalInstructionSet,
    UpdateResult,
    uploadFile,
    UploadFileMetadata,
    UploadInstructionSet,
    UploadResult,
} from '@homebase-id/js-lib/core';
import {
    hashGuidId,
    jsonStringify64,
    stringToUint8Array,
    uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';

export interface Draft {
    message: RichText | undefined;
    updatedAt: number;
}

export interface CommunityDrafts {
    drafts?: Record<string, Draft | undefined>;

    // Community info
    odinId: string;
    communityId: string;
}

export const LOCAL_COMMUNITY_APP_DRIVE: TargetDrive = {
    alias: '3e5de26f-8fa3-43c1-975a-d0dd2aa8564c',
    type: '93a6e08d-14d9-479e-8d99-bae4e5348a16',
};

export const COMMUNITY_DRAFTS_FILE_TYPE = 7017;

export const uploadCommunityDrafts = async (
    dotYouClient: DotYouClient,
    communityId: string,
    definition: NewHomebaseFile<CommunityDrafts> | HomebaseFile<CommunityDrafts>,
    onVersionConflicht?: () => Promise<void | UploadResult | UpdateResult> | void
): Promise<UploadResult | UpdateResult | undefined> => {
    if (!communityId) {
        throw new Error('communityId param is required');
    }
    
    if (!definition.fileMetadata.appData.uniqueId) {
        throw new Error('CommunityDrafts must have a uniqueId');
    }

    const payloads: PayloadFile[] = [];

    const jsonContent: string = jsonStringify64({ ...definition.fileMetadata.appData.content });
    const payloadBytes = stringToUint8Array(
        jsonStringify64({ ...definition.fileMetadata.appData.content })
    );

    const shouldEmbedContent = uint8ArrayToBase64(payloadBytes).length < MAX_HEADER_CONTENT_BYTES;
    const content = shouldEmbedContent
        ? jsonContent
        : jsonStringify64({
            ...definition.fileMetadata.appData.content,
            drafts: undefined,
        });

    if (!shouldEmbedContent) {
        payloads.push({
            key: DEFAULT_PAYLOAD_KEY,
            payload: new Blob([payloadBytes], { type: 'application/json' }),
        });
    }

    const metadata: UploadFileMetadata = {
        versionTag: definition.fileMetadata.versionTag,
        allowDistribution: false,
        appData: {
            tags: definition.fileMetadata.appData.tags,
            uniqueId: await hashCommunityId(communityId), //old: await hashGuidId(definition.fileMetadata.appData.uniqueId),
            fileType: COMMUNITY_DRAFTS_FILE_TYPE,
            content: content,
        },
        isEncrypted: true,
        accessControlList: {
            requiredSecurityGroup: SecurityGroupType.Owner,
        },
    };

    if (definition.fileId) {
        const existingDefiniton = definition as HomebaseFile<CommunityDrafts, string>;
        const encryptedKeyHeader = existingDefiniton.sharedSecretEncryptedKeyHeader;

        const patchInstructions: UpdateLocalInstructionSet = {
            file: {
                fileId: existingDefiniton.fileId,
                targetDrive: LOCAL_COMMUNITY_APP_DRIVE,
            },
            versionTag: existingDefiniton.fileMetadata.versionTag,
            locale: 'local'
        }

        const patchResult = await patchFile(dotYouClient, encryptedKeyHeader, patchInstructions, metadata, payloads, undefined, undefined, onVersionConflicht as () => Promise<void | UpdateResult>,
        );
        if (!patchResult) throw new Error(`Upload failed`);
        return patchResult;
    }

    const instructionSet: UploadInstructionSet = {
        storageOptions: {
            overwriteFileId: definition.fileId,
            drive: LOCAL_COMMUNITY_APP_DRIVE,
        },
    };

    const result = await uploadFile(
        dotYouClient,
        instructionSet,
        metadata,
        payloads,
        undefined,
        true,
        onVersionConflicht as () => Promise<void | UploadResult>
    );
    if (!result) throw new Error(`Upload failed`);

    return result;
};

export const hashCommunityId = async (communityId: string) =>{
    return await hashGuidId("drafts" + communityId);
}

export const getCommunityDrafts = async (
    dotYouClient: DotYouClient,
    communityId: string
): Promise<HomebaseFile<CommunityDrafts> | null> => {
    const header = await getFileHeaderByUniqueId(
        dotYouClient,
        LOCAL_COMMUNITY_APP_DRIVE,
        await hashCommunityId(communityId)
    );

    if (!header) return null;
    return dsrToCommunityDrafts(dotYouClient, header, LOCAL_COMMUNITY_APP_DRIVE, true);
};

// Helpers

export const dsrToCommunityDrafts = async (
    dotYouClient: DotYouClient,
    dsr: HomebaseFile,
    targetDrive: TargetDrive,
    includeMetadataHeader: boolean
): Promise<HomebaseFile<CommunityDrafts> | null> => {
    try {
        const definitionContent = await getContentFromHeaderOrPayload<Partial<CommunityDrafts>>(
            dotYouClient,
            targetDrive,
            dsr,
            includeMetadataHeader
        );
        if (!definitionContent) return null;

        const file: HomebaseFile<CommunityDrafts> = {
            ...dsr,
            fileMetadata: {
                ...dsr.fileMetadata,
                appData: {
                    ...dsr.fileMetadata.appData,
                    content: {
                        // Default values
                        communityId: dsr.fileMetadata.appData.uniqueId as string,
                        odinId: window.location.host,
                        ...definitionContent,
                    },
                },
            },
        };

        return file;
    } catch (ex) {
        console.error('[community] failed to get the CommunityDrafts of a dsr', dsr, ex);
        return null;
    }
};