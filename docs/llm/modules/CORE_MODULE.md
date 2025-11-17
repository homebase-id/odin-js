# CORE Module Documentation

## Overview
The CORE module (`@homebase-id/js-lib/core`) provides the foundational functionality for interacting with Homebase. It includes the DotYouClient for API communication, drive management, file operations, security, querying, uploading, WebSocket notifications, and reactions.

**All functions and types documented below are verified exports from the actual source code.**

---

## Constants

### `DEFAULT_PAYLOAD_KEY`
Default payload key constant: `'dflt_key'`

### `DEFAULT_PAYLOAD_DESCRIPTOR_KEY`
Default payload descriptor key: `'pld_desc'`

### `MAX_PAYLOAD_DESCRIPTOR_BYTES`
Maximum payload descriptor size in bytes: `1024`

### `MAX_HEADER_CONTENT_BYTES`
Maximum header content size in bytes: `7000`

### `TRANSIENT_TEMP_DRIVE_ALIAS`
Transient temporary drive alias ID: `'90f5e74ab7f9efda0ac298373a32ad8c'`

---

## DotYouClient

Main class for communicating with Homebase API. Manages authentication tokens, host information, and provides axios instance configuration.

**Export**: `DotYouClient` class

---

## Interception Encryption Utilities

### `InterceptionEncryptionUtil.encryptUrl(url, ss)`
Encrypts a URL using shared secret
- **url**: `string` - URL to encrypt
- **ss**: `Uint8Array` - Shared secret key
- **Returns**: `Promise<string>` - Encrypted URL

### `InterceptionEncryptionUtil.encryptData(data, iv, ss)`
Encrypts data using AES-CBC with shared secret
- **data**: `string` - Data to encrypt
- **iv**: `Uint8Array` - Initialization vector
- **ss**: `Uint8Array` - Shared secret
- **Returns**: `Promise<string>` - Encrypted data

### `InterceptionEncryptionUtil.buildIvFromQueryString(querystring)`
Builds initialization vector from query string
- **querystring**: `string` - Query string
- **Returns**: `Promise<Uint8Array>` - IV bytes

### `getRandomIv()`
Generates a random 16-byte initialization vector
- **Returns**: `Uint8Array` - Random IV

### `decryptData(data, iv, ss)`
Decrypts AES-CBC encrypted data
- **data**: `string` - Encrypted data
- **iv**: `string` - Initialization vector
- **ss**: `Uint8Array` - Shared secret
- **Returns**: `Promise<string>` - Decrypted data

**Type Export**: `SharedSecretEncryptedPayload` interface

---

## Drive Management

### `getDrives(dotYouClient)`
Get all drives for the authenticated user
- **dotYouClient**: `DotYouClient`
- **Returns**: `Promise<PermissionedDrive[]>`

### `getDrivesByType(dotYouClient, type)`
Get drives filtered by type
- **dotYouClient**: `DotYouClient`
- **type**: `string` - Drive type filter
- **Returns**: `Promise<PermissionedDrive[]>`

### `ensureDrive(dotYouClient, targetDrive, name, metadata, allowAnonymousReads, allowSubscriptions, attributes)`
Creates or ensures a drive exists
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **name**: `string`
- **metadata**: `string`
- **allowAnonymousReads**: `boolean`
- **allowSubscriptions**: `boolean`
- **attributes**: `Record<string, string>`
- **Returns**: `Promise<DriveDefinition>`

### `editDriveMetadata(dotYouClient, targetDrive, name, metadata)`
Updates drive metadata
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **name**: `string`
- **metadata**: `string`
- **Returns**: `Promise<void>`

### `editDriveAllowAnonymousRead(dotYouClient, targetDrive, allowAnonymousReads)`
Enables/disables anonymous read access
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **allowAnonymousReads**: `boolean`
- **Returns**: `Promise<void>`

### `editDriveArchiveFlag(dotYouClient, targetDrive, isArchived)`
Sets drive archive status
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **isArchived**: `boolean`
- **Returns**: `Promise<void>`

### `editDriveAllowSubscriptions(dotYouClient, targetDrive, allowSubscriptions)`
Enables/disables drive subscriptions
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **allowSubscriptions**: `boolean`
- **Returns**: `Promise<void>`

### `editDriveAttributes(dotYouClient, targetDrive, attributes)`
Updates drive attributes
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **attributes**: `Record<string, string>`
- **Returns**: `Promise<void>`

### `getDriveStatus(dotYouClient, targetDrive)`
Gets current drive status information
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **Returns**: `Promise<DriveStatus>`

**Type Exports**: `PermissionedDrive`, `DriveDefinition`, `DrivePermissionType`, `PermissionSet`, `DriveStatus`

---

## File Operations

### `getFileHeader<T>(dotYouClient, targetDrive, fileId, options?)`
Gets file metadata/header
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **options**: `{ systemFileType?, decrypt?, axiosConfig? }`
- **Returns**: `Promise<HomebaseFile<T> | null>`

### `getFileHeaderBytes(dotYouClient, targetDrive, fileId, options?)`
Gets raw file header bytes
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **options**: `{ systemFileType?, axiosConfig? }`
- **Returns**: `Promise<Uint8Array | null>`

### `getPayloadAsJson<T>(dotYouClient, targetDrive, fileId, key?, options?)`
Gets file payload as JSON
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **key**: `string` - Payload key (default: DEFAULT_PAYLOAD_KEY)
- **options**: `{ decrypt?, systemFileType?, axiosConfig? }`
- **Returns**: `Promise<T | null>`

### `getPayloadBytes(dotYouClient, targetDrive, fileId, key?, options?)`
Gets raw payload bytes
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **key**: `string`
- **options**: `{ decrypt?, chunkStart?, chunkEnd?, systemFileType?, axiosConfig? }`
- **Returns**: `Promise<Uint8Array | null>`

### `getThumbBytes(dotYouClient, targetDrive, fileId, options?)`
Gets thumbnail image bytes
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **options**: `{ width?, height?, payloadKey?, systemFileType?, axiosConfig? }`
- **Returns**: `Promise<Uint8Array | null>`

### `getTransferHistory(dotYouClient, targetDrive, fileId, options?)`
Gets file transfer history
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **options**: `{ systemFileType?, axiosConfig? }`
- **Returns**: `Promise<TransferHistory | null>`

### `getContentFromHeader<T>(dotYouClient, dsr)`
Extracts content from file header
- **dotYouClient**: `DotYouClient`
- **dsr**: `HomebaseFile`
- **Returns**: `Promise<T | null>`

### `getContentFromHeaderOrPayload<T>(dotYouClient, dsr, options?)`
Gets content from header, or falls back to payload if not in header
- **dotYouClient**: `DotYouClient`
- **dsr**: `HomebaseFile`
- **options**: `{ systemFileType?, axiosConfig? }`
- **Returns**: `Promise<T | null>`

### `getLocalContentFromHeader<T>(file)`
Extracts local metadata content from header
- **file**: `HomebaseFile`
- **Returns**: `Promise<T | null>`

### File Operations by Unique ID

All functions above have `ByUniqueId` variants that take `uniqueId` instead of `fileId`:

- `getFileHeaderByUniqueId<T>(dotYouClient, targetDrive, uniqueId, options?)`
- `getFileHeaderBytesByUniqueId(dotYouClient, targetDrive, uniqueId, options?)`
- `getPayloadAsJsonByUniqueId<T>(dotYouClient, targetDrive, uniqueId, key?, options?)`
- `getPayloadBytesByUniqueId(dotYouClient, targetDrive, uniqueId, key?, options?)`
- `getThumbBytesByUniqueId(dotYouClient, targetDrive, uniqueId, options?)`

### File Operations by Global Transit ID

All functions above have `ByGlobalTransitId` variants:

- `getFileHeaderByGlobalTransitId<T>(dotYouClient, globalTransitId, options?)`
- `getFileHeaderBytesByGlobalTransitId(dotYouClient, globalTransitId, options?)`

### File Management

### `deleteFile(dotYouClient, targetDrive, fileId, options?)`
Deletes a single file
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **options**: `{ systemFileType? }`
- **Returns**: `Promise<void>`

### `deleteFiles(dotYouClient, targetDrive, fileIds, options?)`
Deletes multiple files
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileIds**: `string[]`
- **options**: `{ systemFileType? }`
- **Returns**: `Promise<void>`

### `deleteFilesByGroupId(dotYouClient, targetDrive, groupId, options?)`
Deletes all files in a group
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **groupId**: `string`
- **options**: `{ systemFileType? }`
- **Returns**: `Promise<void>`

**Type Exports**: `SystemFileType`, `FileMetadata`, `LocalAppData`, `AccessControlList`, `SecurityGroupType`, `TransferStatus`, `FailedTransferStatuses`, `RecipientTransferSummary`, `ServerMetaData`, `RecipientTransferHistory`, `TransferHistory`, `ImageSize`, `EmbeddedThumb`, `ThumbnailFile`, `BasePayloadFile`, `PayloadFileWithRegularEncryption`, `PayloadFileWithManualEncryption`, `PayloadFile`, `ArchivalStatus`, `AppFileMetaData`, `FileIdFileIdentifier`, `GlobalTransitIdFileIdentifier`, `UniqueIdFileIdentifier`, `FileIdentifier`

---

## File Upload & Update

### `uploadFile(dotYouClient, instructionSet, metadata, payloads?, options?)`
Uploads a new file to a drive
- **dotYouClient**: `DotYouClient`
- **instructionSet**: `UploadInstructionSet`
- **metadata**: `UploadFileMetadata`
- **payloads**: `PayloadFile[]`
- **options**: `{ systemFileType?, axiosConfig?, onVersionConflict?, encrypt? }`
- **Returns**: `Promise<UploadResult>`

### `patchFile(dotYouClient, instructionSet, metadata, payloads?, options?)`
Updates an existing file
- **dotYouClient**: `DotYouClient`
- **instructionSet**: `UpdateInstructionSet`
- **metadata**: `UploadFileMetadata`
- **payloads**: `PayloadFile[]`
- **options**: `{ systemFileType?, axiosConfig?, onVersionConflict?, encrypt? }`
- **Returns**: `Promise<UpdateResult>`

### `reUploadFile(dotYouClient, instructionSet, metadata, payloads?, options?)`
Re-uploads a file after a version conflict
- **dotYouClient**: `DotYouClient`
- **instructionSet**: `UploadInstructionSet | UpdateInstructionSet`
- **metadata**: `UploadFileMetadata`
- **payloads**: `PayloadFile[]`
- **options**: `{ systemFileType?, axiosConfig?, onVersionConflict?, encrypt? }`
- **Returns**: `Promise<UploadResult | UpdateResult>`

### `uploadLocalMetadataTags(dotYouClient, targetDrive, fileId, tags, versionTag?)`
Updates local metadata tags only
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **tags**: `number[]`
- **versionTag**: `string`
- **Returns**: `Promise<LocalMetadataUploadResult>`

### `uploadLocalMetadataContent(dotYouClient, targetDrive, fileId, content, versionTag?)`
Updates local metadata content only
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **content**: `unknown`
- **versionTag**: `string`
- **Returns**: `Promise<LocalMetadataUploadResult>`

### Upload Helpers

### `GenerateKeyHeader(aesKey?)`
Generates encryption key header
- **aesKey**: `Uint8Array` - Optional AES key, generates random if not provided
- **Returns**: `KeyHeader`

### `encryptMetaData(metadata, key)`
Encrypts file metadata
- **metadata**: `UploadFileMetadata`
- **key**: `Uint8Array`
- **Returns**: `Promise<UploadFileMetadata>`

### `buildManifest(instructionSet, metadata)`
Builds upload manifest
- **instructionSet**: `UploadInstructionSet`
- **metadata**: `UploadFileMetadata`
- **Returns**: `UploadManifest`

### `buildUpdateManifest(instructionSet, metadata)`
Builds update manifest
- **instructionSet**: `UpdateInstructionSet`
- **metadata**: `UploadFileMetadata`
- **Returns**: `UpdateManifest`

### `buildDescriptor(payloads, thumbnails, encrypt, key)`
Builds payload descriptor
- **payloads**: `PayloadFile[]`
- **thumbnails**: `EmbeddedThumb[]`
- **encrypt**: `boolean`
- **key**: `Uint8Array`
- **Returns**: `Promise<PayloadDescriptor>`

### `buildFormData(manifest, descriptor, payloads)`
Constructs multipart form data for upload
- **manifest**: `UploadManifest | UpdateManifest`
- **descriptor**: `PayloadDescriptor`
- **payloads**: `PayloadFile[]`
- **Returns**: `Promise<FormData>`

### `pureUpload(dotYouClient, targetDrive, formData, options?)`
Low-level upload operation
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **formData**: `FormData`
- **options**: `{ systemFileType?, axiosConfig? }`
- **Returns**: `Promise<UploadResult>`

### `pureUpdate(dotYouClient, targetDrive, formData, options?)`
Low-level update operation
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **formData**: `FormData`
- **options**: `{ systemFileType?, axiosConfig? }`
- **Returns**: `Promise<UpdateResult>`

**Type Exports**: `BaseUploadInstructionSet`, `UploadInstructionSet`, `BaseUpdateInstructionSet`, `UpdatePeerInstructionSet`, `UpdateLocalInstructionSet`, `UpdateInstructionSet`, `isUpdateInstructionSet`, `StorageOptions`, `PushNotificationOptions`, `TransitOptions`, `SendContents`, `ScheduleOptions`, `PriorityOptions`, `UploadFileDescriptor`, `UploadFileMetadata`, `UploadManifest`, `UpdateManifest`, `UploadAppFileMetaData`, `UploadResult`, `UpdateResult`, `TransferUploadStatus`, `LocalMetadataUploadResult`

---

## Query Operations

### `DEFAULT_QUERY_MODIFIED_RESULT_OPTION`
Default result options for queryModified

### `DEFAULT_QUERY_BATCH_RESULT_OPTION`
Default result options for queryBatch

### `queryModified(dotYouClient, params, options?)`
Queries files modified since a cursor
- **dotYouClient**: `DotYouClient`
- **params**: `FileQueryParams`
- **options**: `GetModifiedResultOptions & { axiosConfig?, systemFileType? }`
- **Returns**: `Promise<QueryModifiedResponse>`

### `queryBatch(dotYouClient, params, options?)`
Batch query with pagination
- **dotYouClient**: `DotYouClient`
- **params**: `FileQueryParams`
- **options**: `GetBatchQueryResultOptions & { axiosConfig?, systemFileType? }`
- **Returns**: `Promise<QueryBatchResponseResult>`

### `queryBatchCollection(dotYouClient, params, options?)`
Batch query returning collection page
- **dotYouClient**: `DotYouClient`
- **params**: `FileQueryParams`
- **options**: `GetBatchQueryResultOptions & { axiosConfig?, systemFileType? }`
- **Returns**: `Promise<QueryBatchCollectionResponse>`

**Type Exports**: `QueryParams`, `FileQueryParams`, `GetModifiedResultOptions`, `GetBatchQueryResultOptions`, `QueryModifiedResponse`, `QueryBatchResponse`, `QueryBatchResponseWithDeletedResults`, `QueryBatchResponseResult`, `QueryBatchCollectionResponse`, `TimeRange`, `PagedResult`, `CursoredResult`, `NumberCursoredResult`, `MultiRequestCursoredResult`, `PagingOptions`

---

## Security Operations

### `decryptJsonContent<T>(header, key)`
Decrypts JSON content from encrypted header
- **header**: `HomebaseFile`
- **key**: `Uint8Array`
- **Returns**: `Promise<T | null>`

### `decryptKeyHeader(keyHeader, sharedSecret)`
Decrypts encryption key header
- **keyHeader**: `KeyHeader`
- **sharedSecret**: `Uint8Array`
- **Returns**: `Promise<Uint8Array>`

**Type Exports**: All types from `SecurityTypes.ts`

---

## WebSocket Notifications

### `Subscribe(dotYouClient, driveId, options?)`
Subscribes to drive notifications
- **dotYouClient**: `DotYouClient`
- **driveId**: `string`
- **options**: `{ onMessage?, onClose?, onError?, appendKey?, enabled? }`
- **Returns**: `Promise<{ id: string }>`

### `Unsubscribe(dotYouClient, id)`
Unsubscribes from drive notifications
- **dotYouClient**: `DotYouClient`
- **id**: `string` - Subscription ID
- **Returns**: `void`

### `Notify(command)`
Sends a notification command
- **command**: `WebsocketCommand`
- **Returns**: `Promise<void>`

### WebSocket Helpers

### `ParseRawClientNotification(msg)`
Parses raw client notification message
- **msg**: `RawClientNotification`
- **Returns**: Parsed notification object

### `parseMessage(msg, dotYouClient, sharedSecret?)`
Parses WebSocket message
- **msg**: `MessageEvent`
- **dotYouClient**: `DotYouClient`
- **sharedSecret**: `Uint8Array`
- **Returns**: `Promise<TypedConnectionNotification>`

**Type Exports**: `EstablishConnectionRequest`, `NotificationType`, `ClientNotification`, `ClientFileNotification`, `ClientTransitNotification`, `ClientDeviceNotification`, `AppNotification`, `ReactionNotification`, `ClientConnectionNotification`, `ClientConnectionFinalizedNotification`, `ClientUnknownNotification`, `TypedConnectionNotification`, `WebsocketCommand`, `RawClientNotification`

---

## Reactions

### Emoji Reactions

### `uploadReaction(dotYouClient, targetDrive, fileId, emoji, authorOdinId?)`
Adds an emoji reaction to a file
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **emoji**: `string`
- **authorOdinId**: `string`
- **Returns**: `Promise<void>`

### `deleteReaction(dotYouClient, targetDrive, fileId, reactionId)`
Removes an emoji reaction
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **reactionId**: `string`
- **Returns**: `Promise<void>`

### `getReactions(dotYouClient, targetDrive, fileId, cursor?)`
Gets all reactions for a file
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **cursor**: `string`
- **Returns**: `Promise<ServerReactionsListWithCursor>`

### Group Reactions

### `getGroupReactions(dotYouClient, targetDrive, fileId, cursor?)`
Gets group-based reactions
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **cursor**: `string`
- **Returns**: `Promise<GroupEmojiReaction[]>`

### `uploadGroupReaction(dotYouClient, targetDrive, fileId, emoji)`
Adds a group reaction
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **emoji**: `string`
- **Returns**: `Promise<void>`

### `deleteGroupReaction(dotYouClient, targetDrive, fileId, reactionId)`
Removes a group reaction
- **dotYouClient**: `DotYouClient`
- **targetDrive**: `TargetDrive`
- **fileId**: `string`
- **reactionId**: `string`
- **Returns**: `Promise<void>`

**Type Exports**: `ServerReactionsListWithCursor`, `GroupEmojiReaction`

---

## Push Notifications

All exports from `PushNotificationsService.ts`

---

## Error Handling

All exports from `KnownErrors.ts`

---

## File Helper Utilities

### `getCacheKey(targetDrive, id, decrypt)`
Generates cache key for file
- **targetDrive**: `TargetDrive`
- **id**: `string`
- **decrypt**: `boolean`
- **Returns**: `string`

### `getAxiosClient(dotYouClient, systemFileType?)`
Gets configured axios instance
- **dotYouClient**: `DotYouClient`
- **systemFileType**: `SystemFileType`
- **Returns**: `AxiosInstance`

### `parseBytesToObject<T>(bytes, decrypt, keyHeader, sharedSecret?)`
Parses bytes to object with optional decryption
- **bytes**: `Uint8Array`
- **decrypt**: `boolean`
- **keyHeader**: `KeyHeader`
- **sharedSecret**: `Uint8Array`
- **Returns**: `Promise<T | null>`

### `getRangeHeader(chunkStart?, chunkEnd?)`
Generates HTTP Range header
- **chunkStart**: `number`
- **chunkEnd**: `number`
- **Returns**: `string`

---

## Summary

The CORE module provides:
- **DotYouClient**: Main API client
- **Drive Management**: Create, update, query drives
- **File Operations**: Read, write, delete files with various ID types
- **Upload System**: Upload and patch files with encryption
- **Query Service**: Batch and modified queries
- **Security**: Encryption, decryption, key management
- **WebSocket**: Real-time notifications and subscriptions
- **Reactions**: Emoji and group reactions
- **Utilities**: Caching, parsing, helpers

All exports are verified from actual source code in `packages/libs/js-lib/src/core/`.
