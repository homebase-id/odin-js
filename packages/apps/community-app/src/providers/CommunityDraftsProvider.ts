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

export const COMMUNITY_DRAFTS_FILE_TYPE = 7012;

export const uploadCommunityDrafts = async (
    dotYouClient: DotYouClient,
    definition: NewHomebaseFile<CommunityDrafts> | HomebaseFile<CommunityDrafts>,
    onVersionConflict?: () => Promise<void | UploadResult | UpdateResult> | void
): Promise<UploadResult | UpdateResult | undefined> => {
    if (!definition.fileMetadata.appData.uniqueId) {
        throw new Error('CommunityDrafts must have a uniqueId');
    }

    const payloads: PayloadFile[] = [];

    const jsonContent: string = jsonStringify64({...definition.fileMetadata.appData.content});
    const payloadBytes = stringToUint8Array(
        jsonStringify64({...definition.fileMetadata.appData.content})
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
            payload: new Blob([payloadBytes], {type: 'application/json'}),
        });
    }

    const hashedUniqueId = await hashGuidId(definition.fileMetadata.appData.uniqueId);
    console.info(`uploadCommunityDrafts: UniqueId: ${definition.fileMetadata.appData.uniqueId} / hashed: ${hashedUniqueId}.  Does this match results from getCommunityDrafts -> getFileHeaderByUniqueId`)

    const metadata: UploadFileMetadata = {
        versionTag: definition.fileMetadata.versionTag,
        allowDistribution: false,
        appData: {
            tags: definition.fileMetadata.appData.tags,
            uniqueId: hashedUniqueId,
            fileType: COMMUNITY_DRAFTS_FILE_TYPE,
            content: content,
        },
        isEncrypted: true,
        accessControlList: {
            requiredSecurityGroup: SecurityGroupType.Owner,
        },
    };

    if (definition.fileId) {
        const existingDefinition = definition as HomebaseFile<CommunityDrafts, string>;
        const encryptedKeyHeader = existingDefinition.sharedSecretEncryptedKeyHeader;

        const patchInstructions: UpdateLocalInstructionSet = {
            file: {
                fileId: existingDefinition.fileId,
                targetDrive: LOCAL_COMMUNITY_APP_DRIVE,
            },
            versionTag: existingDefinition.fileMetadata.versionTag,
            locale: 'local'
        }

        console.info('patchInstructions -> ', patchInstructions, metadata);

        const patchResult = await patchFile(
            dotYouClient,
            encryptedKeyHeader,
            patchInstructions,
            metadata,
            payloads,
            undefined,
            undefined,
            onVersionConflict as () => Promise<void | UpdateResult>);

        console.info("community draft patch result", patchResult);

        if (!patchResult) throw new Error(`Patch failed`);

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
        onVersionConflict as () => Promise<void | UploadResult>
    );
    if (!result) throw new Error(`Upload failed`);

    return result;
};

export const getCommunityDrafts = async (
    dotYouClient: DotYouClient,
    communityId: string
): Promise<HomebaseFile<CommunityDrafts> | null> => {

    const cid = await hashGuidId(communityId);
    console.info(`getCommunityDrafts -> getFileHeaderByUniqueId (communityId: ${communityId} hashed: ${cid}`);
    const header = await getFileHeaderByUniqueId(
        dotYouClient,
        LOCAL_COMMUNITY_APP_DRIVE,
        cid
    );

    if (!header) {
        console.info(`getCommunityDrafts -> getFileHeaderByUniqueId (communityId: ${communityId} hashed: ${cid} - HEADER NOT FOUND`);
        return null;
    }

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

        console.info(`dsrToCommunityDrafts -> getting content via dsr:`, dsr)

        const definitionContent = await getContentFromHeaderOrPayload<Partial<CommunityDrafts>>(
            dotYouClient,
            targetDrive,
            dsr,
            includeMetadataHeader
        );

        if (!definitionContent) {
            console.info("dsrToCommunityDrafts -> no content found")
            return null;
        }

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

        console.info("community dsrToCommunityDrafts result", file);

        return file;
    } catch (ex) {
        console.error('[community] failed to get the CommunityDrafts of a dsr', dsr, ex);
        return null;
    }
};
