# Architecture Documentation

## System Overview

The `odin-js` library (`packages/libs/js-lib`) is a TypeScript SDK for interacting with the DotYou/Odin distributed personal data platform. It provides encrypted data storage, querying, and peer-to-peer synchronization capabilities.

## Core Components

### 1. DotYouClient (API Client)

**Location**: `packages/libs/js-lib/src/core/DotYouClient.ts`

The central client for all API operations. Handles:

- HTTP request/response lifecycle
- Automatic encryption/decryption via Axios interceptors
- Multiple API types (Owner, App, Guest)
- Shared secret management (credentials obtained from login, unique per identity/session)

**Key Features**:

- Transparent encryption: Non-GET requests encrypt body, GET requests encrypt URL params
- Automatic decryption: Response bodies decrypted when `sharedSecret` present
- Identity-based routing: Routes to `https://{hostIdentity}/api/{apiType}/v1/...`

**Configuration**:

```typescript
new DotYouClient({
  api: ApiType.Owner | ApiType.App | ApiType.Guest,
  hostIdentity: string,           // homebaseId (domain-based identity, e.g., "alice.dotyou.cloud")
  sharedSecret?: Uint8Array,      // Symmetric key obtained from login, stored securely
  headers?: { Authorization: string } // Bearer token obtained from login
})
```

### 2. Drive System

**Location**: `packages/libs/js-lib/src/core/DriveData/Drive/`

Drives are logical storage containers within an identity.

**TargetDrive Structure**:

```typescript
{
  type: string,  // e.g., "30e18f35a9448c15ab6f6b9df38e8f4e"
  alias: string  // e.g., "a88adbecf95b4ef2a0d7f6a42c8b4e88"
}
```

**Drive Operations**:

- `getDrivesByType()`: Query drives by type
- `getDriveDefinition()`: Fetch drive metadata and configuration
- Drive definitions include ACLs, tags, attributes

### 3. File System

**Location**: `packages/libs/js-lib/src/core/DriveData/File/`

Files are the fundamental storage unit. Structure:

**HomebaseFile<T>**:

```typescript
{
  fileId: string,
  fileMetadata: {
    versionTag: string,
    appData: {
      uniqueId: string,
      fileType: number,
      dataType: number,
      userDate: number,
      tags: string[],
      groupId?: string,
      archivalStatus: number,
      content: T  // Strongly typed payload
    },
    isEncrypted: boolean,
    accessControlList: {
      requiredSecurityGroup: SecurityGroupType
    }
  },
  fileState: string,
  sharedSecretEncryptedKeyHeader: EncryptedKeyHeader,
  serverMetadata: {
    accessControlList: { ... }
  }
}
```

**File Operations**:

- **Query**: `DriveQueryService.queryBatch()` with filters
- **Read**: `getFileHeader()`, `getPayloadBytes()`, `getContentFromHeaderOrPayload()`
- **Write**: `DriveFileUploader.uploadFile()` with metadata and optional payload
- **Delete**: `deleteFile()` with optional cascading

### 4. Query System

**Location**: `packages/libs/js-lib/src/core/DriveData/Query/`

Powerful filtering and pagination for file discovery.

**FileQueryParams**:

```typescript
{
  targetDrive: TargetDrive,
  fileType?: number[],         // Filter by appData.fileType
  dataType?: number[],          // Filter by appData.dataType
  groupId?: string[],           // Filter by appData.groupId
  tagsMatchAll?: string[],      // AND match on tags
  tagsMatchAny?: string[],      // OR match on tags
  clientUniqueId?: string,      // Filter by uniqueId
  archivalStatus?: number,      // 0=none, 1=archived, 2=deleted
  includeHeaderContent?: boolean, // Fetch payload in query
  maxRecords?: number,          // Page size
  cursorState?: string          // Pagination cursor
}
```

**Query Functions**:

- `queryBatch()`: Single drive query with pagination
- `queryBatchCollection()`: Multi-drive aggregated query
- Returns `{ searchResults: HomebaseFile[], cursorState?: string }`

### 5. Upload System

**Location**: `packages/libs/js-lib/src/core/DriveData/Upload/`

Handles file creation and updates with encryption.

**UploadInstructionSet**:

```typescript
{
  transferIv: Uint8Array,       // Random IV for this upload
  storageOptions: {
    drive: TargetDrive,
    overwriteFileId?: string    // Update existing file if provided
  }
}
```

**Upload Process**:

1. Generate `transferIv` (16 random bytes)
2. Build `UploadFileMetadata` with typed content
3. Optionally attach payload bytes and thumbnails
4. Call `uploadFile()` → returns `{ file: { fileId, ... } }`
5. File encrypted automatically by `DotYouClient` interceptors

### 6. Security & Encryption

**Location**: `packages/libs/js-lib/src/core/InterceptionEncryptionUtil.ts`

**Encryption Flow**:

- **Requests**: Intercept → Encrypt body with AES-256-GCM → Add IV to headers
- **Responses**: Intercept → Decrypt body using IV from headers → Return plain data
- **GET URLs**: Encrypt sensitive query params, encode as base64

**Key Management**:

- `sharedSecret`: Symmetric key (Uint8Array) for client-server encryption
- `transferIv`: Per-upload IV for file content encryption
- ECC key exchange: Used during authentication to derive shared secrets

**Security Helpers**:

- `assertIfDotYouClientIsOwner()`: Guard owner-only operations
- `handleErrorResponse()`: Parse and throw typed errors
- `getContentFromHeaderOrPayload()`: Safely decrypt and hydrate content

### 7. WebSocket System

**Owner Notifications** (`packages/libs/js-lib/src/core/WebsocketData/NotificationProvider.ts`):

- Real-time updates for owned drives
- Notifications: `fileAdded`, `fileModified`, `fileDeleted`, `statisticsChanged`
- Subscribe to multiple drives simultaneously
- Auto-reconnect on disconnect

**Peer Notifications** (`packages/libs/js-lib/src/peer/WebsocketData/WebsocketProviderOverPeer.ts`):

- Real-time updates from remote identities
- Token-based authentication (cached in localStorage)
- Guest client auto-created for peer connections
- ECC-derived shared secret for encrypted messaging

**WebSocket Lifecycle**:

1. Connect: `wss://{identity}/api/{owner|guest}/v1/notify/ws`
2. Handshake: Send `establishConnectionRequest` with drives
3. Receive: `deviceHandshakeSuccess` confirmation
4. Stream: Notifications for subscribed drives
5. Ping/Pong: Keep-alive every 8 seconds
6. Reconnect: Auto-reconnect on timeout or close

## Domain Architecture

### Public Domain (`src/public/`)

Provides access to public content (posts, files).

**Key Providers**:

- **PostProvider**: CRUD for posts, comments, reactions
- **FileProvider**: Public file access
- **PostChannelManager**: Channel-to-drive mapping

### Network Domain (`src/network/`)

Owner-scoped operations for managing connections.

**Key Providers**:

- **ConnectionProvider**: Manage connections (followers/following)
- **CircleProvider**: Define and manage circles
- **ContactProvider**: Contact information
- **FollowProvider**: Follow/unfollow operations

### Profile Domain (`src/profile/`)

Identity profile data.

**Key Providers**:

- **AttributeProvider**: Profile attributes (name, bio, avatar)
- **ProfileDefinitionProvider**: Profile structure definitions

### Media Domain (`src/media/`)

Media processing utilities (mostly browser-centric).

**Key Providers**:

- **ThumbnailProvider**: Generate and fetch thumbnails
- **ImageProvider**: Image manipulation
- **LinkPreviewProvider**: URL metadata extraction
- **VideoProvider**: Video processing

### Auth Domain (`src/auth/`)

Authentication and key management.

**Key Providers**:

- **AuthenticationProvider**: ECC key exchange, token retrieval
- **EccKeyProvider**: ECC key generation
- **RsaKeyProvider**: RSA key management
- **IdentityProvider**: Identity registration

## Data Flow Patterns

### Pattern 1: Query → Hydrate → Display

```
1. queryBatch(targetDrive, filters)
   ↓
2. Get HomebaseFile[] with encrypted headers
   ↓
3. getContentFromHeaderOrPayload<T>() per file
   ↓
4. Decrypted HomebaseFile<T>[] with typed content
   ↓
5. Render in UI
```

### Pattern 2: Create → Upload → Notify

```
1. Build UploadFileMetadata with content
   ↓
2. uploadFile(instructionSet, metadata, payload?)
   ↓
3. DotYouClient encrypts body
   ↓
4. Server stores encrypted file
   ↓
5. WebSocket notification sent to subscribers
   ↓
6. Subscribers fetch and display
```

### Pattern 3: Update → Overwrite → Sync

```
1. Fetch current file by fileId
   ↓
2. Merge updates into content
   ↓
3. uploadFile() with overwriteFileId=fileId
   ↓
4. Server replaces existing file
   ↓
5. WebSocket "fileModified" notification
   ↓
6. Subscribers refresh display
```

### Pattern 4: Delete → Cascade → Clean

```
1. Query related files (comments, reactions)
   ↓
2. Delete related files first (parallel)
   ↓
3. Delete main file
   ↓
4. WebSocket "fileDeleted" notifications
   ↓
5. Subscribers remove from UI
```

## Pagination Strategy

All query operations return `cursorState`:

```typescript
let cursor: string | undefined;
let allResults: HomebaseFile<T>[] = [];

do {
  const { results, cursorState } = await queryBatch(dotYouClient, {
    targetDrive,
    fileType: [MY_TYPE],
    maxRecords: 50,
    cursorState: cursor,
  });

  allResults.push(...results);
  cursor = cursorState;
} while (cursor);
```

**Best Practices**:

- Use reasonable `maxRecords` (10-100)
- Store `cursorState` for "load more" functionality
- Never fetch unbounded lists

## Error Handling Strategy

**Typed Errors** (`helpers/ErrorHandling/KnownErrors.ts`):

- Import and throw specific error types
- Include context in error messages

**Response Validation**:

```typescript
const response = await dotYouClient
  .createAxiosClient()
  .post('/some/endpoint', data, { validateStatus: () => true });

if (response.status !== 200) {
  throw new ApiError(`Operation failed: ${response.status}`);
}
```

**Graceful Degradation**:

- Return `null` for not-found scenarios
- Log errors without exposing secrets
- Provide fallback UI states

## Performance Considerations

### 1. Query Optimization

- Use `includeHeaderContent: false` when payload not needed
- Filter at query level (fileType, tags) vs. post-filtering
- Implement cursor-based pagination

### 2. Upload Optimization

- Upload thumbnails alongside main file
- Use batch uploads for multiple files
- Limit concurrent uploads (5-10 max)

### 3. WebSocket Optimization

- Subscribe to minimal necessary drives
- Debounce rapid notification bursts
- Unsubscribe when component unmounts

### 4. Caching Strategy

- Cache authentication tokens in localStorage
- Cache drive definitions (rarely change)
- Cache query results with TTL
- Invalidate on WebSocket notifications

## Testing Strategy

**Unit Tests**:

- Test providers with mocked `DotYouClient`
- Verify encryption/decryption logic
- Test error handling paths

**Integration Tests**:

- Use test identity with known credentials
- Test full CRUD lifecycle
- Verify WebSocket notifications

**Build Verification**:

```bash
npm run build:libs
# Check for TypeScript errors
# Verify exports in dist/
```

## Deployment Patterns

### Browser (Vite/React)

```typescript
// After login, retrieve stored credentials
const identity = localStorage.getItem('homebaseId'); // e.g., "alice.dotyou.cloud"
const sharedSecretBase64 = localStorage.getItem('sharedSecret');
const authToken = localStorage.getItem('authToken');

const client = new DotYouClient({
  api: ApiType.Owner,
  hostIdentity: identity,
  sharedSecret: base64ToUint8Array(sharedSecretBase64),
  headers: { Authorization: `Bearer ${authToken}` },
});

// Login flow example
const { sharedSecret, token } = await finalizeAuthentication(identity, publicKey, salt, returnUrl);

// Store securely in localStorage
localStorage.setItem('homebaseId', identity);
localStorage.setItem('sharedSecret', uint8ArrayToBase64(sharedSecret));
localStorage.setItem('authToken', token);
```

### Node.js (Server/CLI)

```typescript
// For server/CLI, credentials can come from environment or secure storage
const client = new DotYouClient({
  api: ApiType.Owner,
  hostIdentity: process.env.HOMEBASE_IDENTITY!, // Domain-based identity
  sharedSecret: base64ToUint8Array(process.env.HOMEBASE_SHARED_SECRET!),
  headers: { Authorization: `Bearer ${process.env.HOMEBASE_TOKEN}` },
});

// Note: In production, use secure credential storage (e.g., secrets manager)
```

### React Native

```typescript
// Same as browser, but WebSocket needs polyfill
import { SubscribeOverPeer } from '@homebase-id/js-lib';

// Pass args for native WebSocket
await SubscribeOverPeer(
  client,
  peerOdinId,
  drives,
  handler,
  undefined,
  undefined,
  {
    headers: {
      /* custom headers */
    },
  } // Platform-specific args
);
```

## Security Model

### Access Control Levels

1. **Owner**: Full access to all drives and files
2. **App**: Scoped access based on app registration
3. **Guest**: Public read-only access

### Encryption Layers

1. **Transport**: HTTPS (TLS) for all requests
2. **Application**: AES-256-GCM with shared secret
3. **Storage**: Server-side encryption at rest

### Trust Boundaries

- Client ↔ Server: Encrypted with shared secret
- Peer ↔ Peer: Encrypted with ECC-derived secret
- Browser ↔ LocalStorage: Credentials stored after successful login (homebaseId, sharedSecret, authToken)

### Authentication Flow

1. **Login**: User provides homebaseId (domain-based identity like "alice.dotyou.cloud")
2. **Key Exchange**: ECC key exchange performed during YouAuth protocol
3. **Credential Receipt**: Server returns `sharedSecret` and `authToken`
4. **Secure Storage**: Credentials stored in localStorage (browser) or secure storage (native)
5. **Client Initialization**: `DotYouClient` created with stored credentials
6. **Session Management**: Credentials persist until logout or expiration

**Note**: The `sharedSecret` is unique per identity and login session. It is NOT a fixed value but dynamically generated during authentication.

## Extension Points

### Adding New Providers

1. Create `src/{domain}/{Feature}Provider.ts`
2. Import and use `DotYouClient`
3. Define types in `{Feature}Types.ts`
4. Export from `src/{domain}/{domain}.ts`
5. Add patterns to documentation

### Custom Data Types

```typescript
// Define your data type constant
export const MY_DATA_TYPE = 9001;

// Define content structure
export type MyContent = {
  field1: string;
  field2: number;
};

// Use in queries
const files = await queryBatch(dotYouClient, {
  targetDrive,
  dataType: [MY_DATA_TYPE],
});
```

### Custom WebSocket Handlers

```typescript
const customHandler = async (client: DotYouClient, notification: TypedConnectionNotification) => {
  // Custom logic based on notification type
  if (notification.notificationType === 'fileAdded') {
    // Handle new file
  }
};

await Subscribe(client, drives, customHandler);
```
