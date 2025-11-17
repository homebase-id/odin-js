# Code Map

Detailed map of modules, files, and their responsibilities in `packages/libs/js-lib`.

## Entry Points

### Main Export

**File**: `packages/libs/js-lib/src/index.ts`

Exports all public APIs organized by domain:

- `helpers/*` - Utility functions
- `core/*` - Core client and data operations
- `network/*` - Network/connection management (owner-only)
- `profile/*` - Profile and identity
- `public/*` - Public content access
- `peer/*` - Peer-to-peer operations
- `auth/*` - Authentication helpers
- `media/*` - Media processing

### Core Re-exports

**File**: `packages/libs/js-lib/src/core/core.ts`

Central export point for core functionality. Re-exports:

- DotYouClient
- Drive providers and types
- File providers and types
- Query services and types
- Upload services and types
- Security helpers
- WebSocket providers
- Reactions

## Core Module (`src/core/`)

### DotYouClient

**File**: `DotYouClient.ts`

The main API client class.

**Key Methods**:

- `createAxiosClient()`: Returns configured Axios instance with interceptors
- `getRoot()`: Returns base URL (`https://{hostIdentity}/api/{apiType}/v1`)
- `getType()`: Returns ApiType (Owner, App, Guest)
- `getSharedSecret()`: Returns encryption key
- `getIdentity()`: Returns host identity
- `getHeaders()`: Returns custom headers

**Interceptors**:

- Request: Encrypts body (non-GET), encrypts URL params (GET)
- Response: Decrypts body using IV from response headers

### Drive Module (`DriveData/Drive/`)

**DriveProvider.ts**:

- `getDrives()`: Get all accessible drives
- `getDrivesByType(type)`: Filter drives by type
- `getDriveDefinition(targetDrive)`: Fetch drive metadata

**DriveTypes.ts**:

- `TargetDrive`: `{ type: string, alias: string }`
- `DriveDefinition`: Full drive configuration
- `SystemDriveType`: Well-known drive types

### File Module (`DriveData/File/`)

**DriveFileProvider.ts**:

- `getFileHeader(targetDrive, fileId)`: Fetch header only
- `getPayloadBytes(targetDrive, fileId, key?)`: Fetch encrypted payload
- `deleteFile(targetDrive, fileId)`: Delete single file
- `getFileHeaderByUniqueId(targetDrive, uniqueId)`: Query by unique ID
- `getBatch(targetDrive, fileIds)`: Fetch multiple files

**DriveFileManager.ts**:

- Higher-level file operations
- `getDecryptedContentFromHeader<T>()`: Decrypt header content
- `getDecryptedPayloadBytes()`: Decrypt payload

**DriveFileTypes.ts**:

- `HomebaseFile<T>`: Typed file structure
- `UploadResult`: Upload response
- `EncryptedKeyHeader`: Encryption metadata
- `SecurityGroupType`: ACL groups (Owner, Connected, Anonymous, etc.)
- `ArchivalStatus`: None, Archived, Deleted

### Query Module (`DriveData/Query/`)

**DriveQueryService.ts**:

- `queryBatch(dotYouClient, params)`: Query single drive
- `queryBatchCollection(dotYouClient, params)`: Query multiple drives

**DriveQueryTypes.ts**:

- `FileQueryParams`: Query filter parameters
- `QueryBatchResponse`: Result + cursor
- `QueryModifiedRequest`: Query by modification date
- `ClientFileSearchRequest`: Internal search structure

### Upload Module (`DriveData/Upload/`)

**DriveFileUploader.ts**:

- `uploadFile(client, instructionSet, metadata, payload?, thumbnails?, additionalMetadata?)`: Main upload
- `uploadHeader(client, instructionSet, metadata)`: Header-only upload
- `uploadStream(client, instructionSet, metadata, stream)`: Streaming upload

**DriveUploadTypes.ts**:

- `UploadInstructionSet`: Upload configuration
- `UploadFileMetadata`: File metadata structure
- `ThumbnailFile`: Thumbnail configuration
- `StorageOptions`: Drive + overwrite settings

### Security Module (`DriveData/SecurityHelpers.ts`)

Functions:

- `getContentFromHeaderOrPayload<T>(client, drive, file)`: Smart content hydration
- `handleErrorResponse(response)`: Parse API errors
- `assertIfDotYouClientIsOwner(client)`: Guard owner operations
- `assertIfDotYouClientIsOwnerOrApp(client)`: Guard owner/app operations

### Encryption Module (`InterceptionEncryptionUtil.ts`)

Functions:

- `encryptData(data, iv, sharedSecret)`: AES-256-GCM encryption
- `decryptData(encryptedData, iv, sharedSecret)`: AES-256-GCM decryption
- `encryptUrl(url, sharedSecret)`: URL parameter encryption
- `decryptUrl(encryptedUrl, sharedSecret)`: URL parameter decryption

### WebSocket Module (`WebsocketData/`)

**NotificationProvider.ts** (Owner WebSocket):

- `Subscribe(client, drives, handler, onDisconnect?, onReconnect?, args?, refId?)`: Subscribe
- `Unsubscribe(handler)`: Unsubscribe
- Manages WebSocket lifecycle, auto-reconnect, ping/pong

**WebsocketTypes.ts**:

- `TypedConnectionNotification`: Parsed notification
- `WebsocketCommand`: Command structure
- `EstablishConnectionRequest`: Connection handshake
- Notification types: `fileAdded`, `fileModified`, `fileDeleted`, `statisticsChanged`

**WebsocketHelpers.ts**:

- `parseMessage(event, sharedSecret)`: Decrypt WebSocket message
- `ParseRawClientNotification()`: Type notification

### Reactions Module (`ReactionData/`)

**ReactionProvider.ts**:

- `addReaction(client, drive, fileId, emoji)`: Add emoji reaction
- `removeReaction(client, drive, fileId, reactionId)`: Remove reaction
- `getReactions(client, drive, fileId)`: Fetch all reactions

**ReactionTypes.ts**:

- `Reaction`: Reaction structure
- `EmojiReaction`: Emoji + metadata

## Public Module (`src/public/`)

### Posts (`posts/`)

**PostProvider.ts**:

- `getRecentPosts(client, drive, cursorState?, pageSize?)`: Recent posts
- `getPosts(client, channelId, type?, includeDrafts, cursorState?, pageSize?)`: Channel posts
- `getPostByFileId(client, drive, fileId)`: Single post by ID
- `getPostBySlug(client, drive, slug)`: Post by slug
- `getPostByGlobalTransitId(client, gtid)`: Post by GTID
- `removePost(client, drive, fileId, deleteComments?)`: Delete with cascade
- `getComments(client, drive, postFileId)`: Fetch comments

**PostTypes.ts**:

- `PostContent`: Post data structure
- `PostComment`: Comment structure
- `PostType`: Article, Photo, Video, etc.
- `SystemFileType`: Standard, Comment

**PostChannelManager.ts**:

- `getChannelDrive(client, channelId)`: Resolve channel to drive
- `getChannels(client)`: List all channels

### Files (`file/`)

**FileProvider.ts**:

- `getPublicFileHeader(client, identity, drive, fileId)`: Guest access to public file
- `getPublicPayload(client, identity, drive, fileId)`: Guest access to payload

**FilePublishManager.ts**:

- `publishFile(client, drive, fileId)`: Make file public
- `unpublishFile(client, drive, fileId)`: Make file private

## Network Module (`src/network/`)

Owner-only operations for managing connections.

### Connections (`connection/`)

**ConnectionProvider.ts**:

- `getConnections(client)`: List all connections
- `getConnection(client, odinId)`: Single connection
- `sendConnectionRequest(client, odinId, message?)`: Request connection
- `acceptConnectionRequest(client, odinId)`: Accept request
- `rejectConnectionRequest(client, odinId)`: Reject request
- `removeConnection(client, odinId)`: Remove connection

**ConnectionTypes.ts**:

- `Connection`: Connection structure
- `ConnectionStatus`: None, Connected, Blocked, Pending

### Circles (`circle/`)

**CircleProvider.ts**:

- `getCircles(client)`: List circles
- `createCircle(client, name, description?)`: Create circle
- `addToCircle(client, circleId, odinIds)`: Add members
- `removeFromCircle(client, circleId, odinIds)`: Remove members

**CircleTypes.ts**:

- `Circle`: Circle structure
- `CircleMember`: Member data

### Contacts (`contact/`)

**ContactProvider.ts**:

- `getContacts(client)`: List contacts
- `getContact(client, odinId)`: Single contact
- `updateContact(client, odinId, data)`: Update contact info

**ContactTypes.ts**:

- `Contact`: Contact structure with custom fields

### Follows (`follow/`)

**FollowProvider.ts**:

- `follow(client, odinId)`: Follow identity
- `unfollow(client, odinId)`: Unfollow identity
- `getFollowing(client)`: List following
- `getFollowers(client)`: List followers

## Profile Module (`src/profile/`)

### Attributes (`AttributeData/`)

**AttributeProvider.ts**:

- `getAttributes(client)`: Fetch all profile attributes
- `getAttribute(client, type)`: Single attribute by type
- `updateAttribute(client, type, data)`: Update attribute

**AttributeTypes.ts**:

- `ProfileAttribute`: Attribute structure
- `AttributeType`: Name, Bio, Avatar, Header, etc.

### Profile Definition (`ProfileData/`)

**ProfileDefinitionProvider.ts**:

- `getProfileDefinition(client)`: Fetch profile schema
- `updateProfileDefinition(client, definition)`: Update schema

**ProfileDefinitionTypes.ts**:

- `ProfileDefinition`: Schema structure
- `ProfileField`: Field definition

## Peer Module (`src/peer/`)

### Peer WebSocket (`WebsocketData/`)

**WebsocketProviderOverPeer.ts**:

- `SubscribeOverPeer(client, peerOdinId, drives, handler, onDisconnect?, onReconnect?, args?, refId?)`: Subscribe to peer
- `UnsubscribeOverPeer(handler)`: Unsubscribe from peer
- Token caching in localStorage
- Auto-creates guest DotYouClient for peer

**Key Features**:

- Fetches peer token via `/notify/peer/token`
- Caches token in localStorage with key `odin_peer_token_{odinId}`
- Invalidates cache on reconnect failures
- Encrypted WebSocket with ECC-derived shared secret

## Auth Module (`src/auth/`)

### Authentication (`providers/`)

**AuthenticationProvider.ts**:

- `finalizeAuthentication(identity, sharedSecret, publicKey)`: Complete auth flow
- ECC key exchange implementation

**EccKeyProvider.ts**:

- `generateEccKey()`: Generate ECC keypair
- `deriveSharedSecret(privateKey, publicKey)`: ECDH key derivation

**RsaKeyProvider.ts**:

- `generateRsaKey()`: Generate RSA keypair
- `exportPublicKey(key)`: Export PEM format

**IdentityProvider.ts**:

- `registerIdentity(domain, publicKey)`: Register new identity
- Domain availability check

## Media Module (`src/media/`)

### Thumbnails (`Thumbs/`)

**ThumbnailProvider.ts**:

- `getThumbnail(client, drive, fileId, size)`: Fetch thumbnail
- `generateThumbnail(imageData, width, height)`: Generate thumbnail

**ThumbnailTypes.ts**:

- `ThumbnailFile`: Thumbnail metadata
- `ThumbnailSize`: Small, Medium, Large

### Image Processing (`ImageProvider.ts`)

Browser-centric image operations:

- `resizeImage(blob, maxWidth, maxHeight)`: Resize image
- `cropImage(blob, x, y, width, height)`: Crop image
- Canvas-based processing

### Link Preview (`Link/LinkPreviewProvider.ts`)

**Functions**:

- `getLinkPreview(client, url)`: Fetch URL metadata
- `getEmbedInfo(url)`: Check if URL is embeddable

**LinkPreviewTypes.ts**:

- `LinkPreview`: Title, description, image, etc.

### Video Processing (`Video/`)

**VideoProvider.ts**:

- `getVideoMetadata(blob)`: Extract video metadata
- `extractVideoFrame(blob, timestamp)`: Get video thumbnail
- WASM-based processing

## Helpers Module (`src/helpers/`)

### Core Helpers (`helpers.ts`)

Utility functions:

- `base64ToUint8Array(base64)`: Convert base64 to bytes
- `uint8ArrayToBase64(bytes)`: Convert bytes to base64
- `getRandom16ByteArray()`: Generate random IV
- `jsonStringify64(obj)`: JSON stringify + base64
- `drivesEqual(a, b)`: Compare TargetDrives
- `hasDebugFlag()`: Check debug mode

### Data Utilities (`DataUtil.ts`)

- `stringifyToQueryString(obj)`: Object to URL params
- `parseQueryString(str)`: URL params to object
- `deepClone<T>(obj)`: Deep clone object

### Error Handling (`ErrorHandling/`)

**KnownErrors.ts**:

- `ApiError`: Base API error
- `AuthenticationError`: Auth failures
- `NotFoundError`: 404 errors
- `PermissionError`: 403 errors
- `ValidationError`: Invalid input

## Type Organization

### Where to find types

- **Core types**: `core/DriveData/File/DriveFileTypes.ts`
- **Query types**: `core/DriveData/Query/DriveQueryTypes.ts`
- **Upload types**: `core/DriveData/Upload/DriveUploadTypes.ts`
- **Post types**: `public/posts/PostTypes.ts`
- **Connection types**: `network/connection/ConnectionTypes.ts`
- **Profile types**: `profile/AttributeData/AttributeTypes.ts`

### Type naming conventions

- `*Content`: Payload structure (e.g., `PostContent`, `MyFeatureContent`)
- `*Params`: Function parameters (e.g., `FileQueryParams`)
- `*Response`: API response (e.g., `QueryBatchResponse`)
- `*Request`: API request (e.g., `EstablishConnectionRequest`)
- `*Metadata`: File metadata (e.g., `UploadFileMetadata`)

## Import Paths

### From application code

```typescript
// Core
import { DotYouClient, ApiType } from '@homebase-id/js-lib';
import { queryBatch, uploadFile } from '@homebase-id/js-lib';
import { HomebaseFile, TargetDrive } from '@homebase-id/js-lib';

// Providers
import { getRecentPosts } from '@homebase-id/js-lib';
import { Subscribe, Unsubscribe } from '@homebase-id/js-lib';
import { getConnections } from '@homebase-id/js-lib';

// Helpers
import { base64ToUint8Array, getRandom16ByteArray } from '@homebase-id/js-lib';
```

### Within the library

Use relative imports:

```typescript
import { DotYouClient } from '../../core/DotYouClient';
import { queryBatch } from '../../core/DriveData/Query/DriveQueryService';
```

## Testing Files

Tests co-located with source files (when present):

- `*.test.ts`: Unit tests
- `*.spec.ts`: Integration tests

Run tests:

```bash
npm run test
```
