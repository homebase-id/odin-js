# Glossary

Comprehensive terminology reference for the DotYou/Odin platform and `odin-js` library.

## Core Concepts

### Identity
A unique identifier for a user or entity on the DotYou network. Format: `username.dotyou.cloud` or `username.customdomain.com`. Also called "Odin ID" or "DotYou ID".

**Example**: `alice.dotyou.cloud`

### Drive
A logical storage container within an identity. Similar to a database table or collection. Identified by `type` and `alias` (both UUIDs).

**Purpose**: Organize files by application, feature, or data category.

**Example**:
```typescript
{
  type: "30e18f35a9448c15ab6f6b9df38e8f4e",
  alias: "a88adbecf95b4ef2a0d7f6a42c8b4e88"
}
```

### TargetDrive
Type definition for identifying a drive. Contains `type` and `alias` strings.

**Used in**: All file operations (query, upload, delete).

### File
The fundamental unit of storage in a drive. Contains:
- **Header**: Metadata (file type, tags, ACL, etc.)
- **Payload** (optional): Actual file content (JSON, binary, etc.)

### FileId
Unique identifier for a file within a drive. Auto-generated on upload. Used to reference specific files.

**Format**: UUID string

### HomebaseFile<T>
TypeScript generic type representing a file with typed content. The `T` generic defines the shape of `fileMetadata.appData.content`.

**Example**:
```typescript
type PostContent = { title: string; body: string };
const post: HomebaseFile<PostContent> = { ... };
// post.fileMetadata.appData.content.title is typed as string
```

## File Metadata

### uniqueId
Application-defined unique identifier for a file. You generate this (e.g., UUID). Used to query files without knowing `fileId`.

**Use case**: Deterministic file references across systems.

### fileType
Numeric identifier for the kind of file. Application-defined constant.

**Example**: `10001` for blog posts, `10002` for comments

### dataType
Numeric identifier for the data structure/schema. Maps to logical types like "Post", "Comment", "Reaction".

**Example**: `postTypeToDataType('article')` → specific number

### userDate
Timestamp (milliseconds since epoch) representing when the user created/modified the file. Not the same as server storage time.

**Purpose**: Sorting and display (e.g., post published date).

### archivalStatus
Numeric flag indicating file lifecycle state:
- `0`: Active (normal)
- `1`: Archived (hidden from default queries)
- `2`: Deleted (soft delete)

### tags
Array of string labels for categorization and querying. Used with `tagsMatchAll` or `tagsMatchAny` in queries.

**Example**: `["public", "featured", "2024"]`

### groupId
Optional string to group related files (e.g., all comments on a post share the same `groupId`).

**Use case**: Cascading deletes, relational queries.

## Query Terms

### queryBatch
Function to search for files in a single drive with filters and pagination.

**Returns**: `{ searchResults: HomebaseFile[], cursorState?: string }`

### queryBatchCollection
Function to search across multiple drives simultaneously.

**Use case**: Aggregated feeds from multiple sources.

### cursorState
Opaque pagination token returned by query functions. Pass to next query to fetch next page.

**Important**: Treat as black box; don't parse or modify.

### maxRecords
Maximum number of files to return in a single query. Recommended: 10-100.

**Default**: Varies by endpoint (often 10-50).

### includeHeaderContent
Boolean flag in queries. When `true`, payload is fetched and included in results. When `false`, only header metadata is returned (faster).

**Optimization**: Use `false` for lists, fetch content on-demand.

### tagsMatchAll
Query filter: Returns only files having ALL specified tags (AND logic).

**Example**: `tagsMatchAll: ["public", "featured"]` → file must have both tags.

### tagsMatchAny
Query filter: Returns files having ANY of the specified tags (OR logic).

**Example**: `tagsMatchAny: ["draft", "published"]` → file has at least one tag.

## Upload Terms

### UploadInstructionSet
Configuration object for file uploads. Specifies drive, IV, and whether to overwrite existing file.

**Key field**: `storageOptions.overwriteFileId` - if provided, updates existing file instead of creating new.

### UploadFileMetadata
Metadata structure for uploads. Contains `versionTag`, `appData`, `isEncrypted`, `accessControlList`.

**Important**: This is what you build before calling `uploadFile()`.

### transferIv
Initialization Vector for encryption. Must be 16 random bytes. Generate with `getRandom16ByteArray()`.

**Purpose**: Ensures unique encryption even with same key and data.

### overwriteFileId
When uploading, if this is provided in `storageOptions`, the upload updates the existing file with that ID instead of creating a new file.

**Use case**: Editing existing content.

## Security & Encryption

### sharedSecret
Symmetric encryption key (AES-256) shared between client and server. Stored as `Uint8Array`.

**Obtained via**: Authentication flow (ECC key exchange).

**Used for**: Transparent request/response encryption.

### ApiType
Enum defining client access level:
- **Owner**: Full access to own identity's data
- **App**: Scoped access based on app registration
- **Guest**: Public read-only access

**Set in**: `DotYouClient` constructor.

### SecurityGroupType
Enum defining ACL (Access Control List) permission levels:
- **Owner**: Only the owner can access
- **Connected**: Owner + connected identities
- **Anonymous**: Public (anyone can read)
- **Authenticated**: Any authenticated user

**Used in**: `fileMetadata.accessControlList.requiredSecurityGroup`

### encryptedKeyHeader
Metadata structure containing encryption IV and key information. Attached to each file.

**Purpose**: Allows decryption of file payload.

## WebSocket Terms

### Subscribe
Function to register a handler for real-time notifications on owned drives.

**Lifecycle**: Maintains persistent WebSocket connection with auto-reconnect.

### SubscribeOverPeer
Function to register a handler for real-time notifications from a remote identity (peer).

**Use case**: Real-time updates from followed users.

### TypedConnectionNotification
Structured notification object sent via WebSocket. Contains:
- `notificationType`: "fileAdded", "fileModified", "fileDeleted", etc.
- `targetDrive`: Which drive the change occurred in
- `header`: File metadata (for add/modify events)

### deviceHandshakeSuccess
WebSocket message confirming successful connection establishment.

**Received after**: Sending `establishConnectionRequest`.

### ping/pong
WebSocket keep-alive mechanism. Client sends "ping", server responds "pong".

**Interval**: Every 8 seconds in this library.

## Domain-Specific Terms

### Post
Content item in a channel (blog post, photo, video, etc.). Stored as a file with `SystemFileType.Standard`.

**Types**: Article, Photo, Video, etc. (defined in `PostType` enum).

### PostContent
Type defining the structure of a post's data. Includes `caption`, `primaryMedia`, `embeddedPost`, etc.

### Comment
A response to a post. Stored as a separate file with `SystemFileType.Comment` and `groupId` referencing the post.

### Reaction
Emoji or other indicator of engagement on a post. Stored as metadata (not separate file).

**Example**: ❤️, 👍, 😂

### Channel
A feed/blog channel. Maps to a specific drive via `PostChannelManager`.

**Purpose**: Organize posts by topic or purpose.

### GlobalTransitId (GTID)
Universal identifier for content that can be referenced across different systems and identities.

**Format**: String combining identity and file identifiers.

**Use case**: Sharing, embedding, cross-identity references.

## Network Terms

### Connection
Mutual relationship between two identities. Required for non-public content sharing.

**Status**: None, Pending, Connected, Blocked.

### Circle
A named group of connections. Similar to "lists" or "groups" in social platforms.

**Use case**: Targeted sharing (e.g., "Family" circle, "Work" circle).

### Follower
An identity that follows your public content (one-way relationship).

### Following
An identity whose public content you follow (one-way relationship).

### Contact
Stored information about another identity. Can include custom fields and notes.

## Authentication Terms

### clientAuthToken
Bearer token for authenticating API requests. Included in `Authorization` header.

**Format**: `Bearer <token>`

### ECC (Elliptic Curve Cryptography)
Asymmetric encryption used for initial key exchange during authentication.

**Result**: Derives a shared secret for symmetric encryption.

### finalizeAuthentication
Function completing the auth flow. Exchanges keys and retrieves token + shared secret.

### peerToken
Token used specifically for peer-to-peer WebSocket connections. Fetched via `/notify/peer/token`.

**Cached in**: `localStorage` with key `odin_peer_token_{odinId}`

## Provider Terms

### Provider
Module containing functions for a specific domain (e.g., `PostProvider`, `DriveProvider`).

**Pattern**: Named `*Provider.ts`, exports functions taking `DotYouClient` as first param.

### Manager
Higher-level module coordinating multiple providers or complex operations.

**Example**: `PostChannelManager` maps channels to drives.

## Technical Terms

### Axios
HTTP client library used internally by `DotYouClient`.

**Why**: Supports request/response interceptors for encryption.

### Interceptor
Middleware function that runs before/after HTTP requests.

**Used for**: Automatic encryption (request) and decryption (response).

### IV (Initialization Vector)
Random data used as additional input to encryption algorithm. Ensures uniqueness.

**Size**: 16 bytes for AES-256-GCM.

### Base64
Encoding format for binary data as ASCII text. Used for transmitting encryption keys and IVs.

**Functions**: `base64ToUint8Array()`, `uint8ArrayToBase64()`

### Uint8Array
TypeScript/JavaScript typed array representing raw bytes.

**Used for**: Encryption keys, IVs, binary payloads.

## Monorepo Terms

### Workspace
npm workspaces feature for managing multiple packages in a single repository.

**Structure**: `packages/libs/`, `packages/apps/`, `packages/common/`

### js-lib
The core library package (`packages/libs/js-lib`). What this documentation primarily covers.

**Purpose**: Reusable SDK for all apps.

### owner-app
Dashboard application for managing your own identity.

**Access**: Owner-level permissions required.

### feed-app
Social feed application for viewing posts from followed identities.

**Access**: Owner or app-level permissions.

## HTTP API Terms

### /api/owner/v1/
API endpoint prefix for owner-scoped operations.

**Auth**: Requires owner token.

### /api/app/v1/
API endpoint prefix for app-scoped operations.

**Auth**: Requires app token.

### /api/guest/v1/
API endpoint prefix for public/guest operations.

**Auth**: Optional (for public data).

### /notify/ws
WebSocket endpoint for owner notifications.

**URL**: `wss://{identity}/api/owner/v1/notify/ws`

### /notify/peer/ws
WebSocket endpoint for peer notifications.

**URL**: `wss://{peerIdentity}/api/guest/v1/notify/peer/ws`

## Development Terms

### Vite
Build tool and dev server used for frontend apps.

**Command**: `npm start` runs Vite dev server.

### TypeScript
Strongly-typed superset of JavaScript. All library code is TypeScript.

**Benefit**: Type safety, IDE autocomplete, compile-time error checking.

### ESLint
Linting tool for code quality and style enforcement.

**Config**: `eslint.config.mjs` in repo root.

### Monorepo
Repository structure containing multiple related packages/apps.

**Benefit**: Shared code, coordinated changes, single version control.

## Acronyms

- **ACL**: Access Control List
- **API**: Application Programming Interface
- **ECC**: Elliptic Curve Cryptography
- **GTID**: Global Transit ID
- **HTTP**: HyperText Transfer Protocol
- **IV**: Initialization Vector
- **SDK**: Software Development Kit
- **TTL**: Time To Live
- **UUID**: Universally Unique Identifier
- **WASM**: WebAssembly
- **WSS**: WebSocket Secure (WebSocket over TLS)

## Common Abbreviations

- **client**: Instance of `DotYouClient`
- **drive**: Short for `TargetDrive`
- **file**: Short for `HomebaseFile`
- **ss**: Short for `sharedSecret`
- **odinId**: Short for "Odin Identity" (e.g., `alice.dotyou.cloud`)

## Conventions

### Naming Patterns

- **Functions**: camelCase (e.g., `queryBatch`, `uploadFile`)
- **Types/Interfaces**: PascalCase (e.g., `HomebaseFile`, `TargetDrive`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MY_DATA_TYPE`, `PING_INTERVAL`)
- **Providers**: PascalCase + "Provider" suffix (e.g., `PostProvider`)
- **Type files**: PascalCase + "Types.ts" suffix (e.g., `PostTypes.ts`)

### File Organization

- **Providers**: `*Provider.ts` files contain functions
- **Types**: `*Types.ts` files contain type definitions
- **Managers**: `*Manager.ts` files contain orchestration logic
- **Tests**: `*.test.ts` or `*.spec.ts` files for testing

## Anti-Patterns to Avoid

### ❌ Don't Do This

- **Bypass encryption**: Don't create raw Axios instances without `DotYouClient`
- **Parse cursorState**: Treat as opaque token, don't try to decode
- **Store secrets in code**: Use environment variables or secure storage
- **Ignore pagination**: Always use `cursorState` and `maxRecords`
- **Log secrets**: Never `console.log(sharedSecret)` or `console.log(token)`
- **Modify types from node_modules**: Fork or contribute upstream instead

### ✅ Do This Instead

- **Use DotYouClient**: Always go through `dotYouClient.createAxiosClient()`
- **Respect cursors**: Store and pass `cursorState` for next page
- **Environment config**: Load secrets from `.env` files
- **Page results**: Use reasonable `maxRecords` (10-100)
- **Secure logging**: Only log non-sensitive data or use debug flags
- **Extend properly**: Create new types that extend library types

## Version Information

### Library Version
Check `packages/libs/js-lib/package.json` for current version.

### API Version
Currently using `/v1/` endpoints. Check docs/api/v2/ for future versions.

### Node Requirements
- Node.js 18+
- npm 9+

### Browser Support
- Modern browsers (ES2020+)
- Safari 14+
- Chrome 90+
- Firefox 88+
- Edge 90+
