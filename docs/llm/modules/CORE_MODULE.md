# Core Module Documentation

## Overview

The **Core module** is the foundation of the js-lib library. It provides the essential building blocks for interacting with the Homebase identity server, including:

- **DotYouClient**: The main client for API communication
- **Drive Management**: File storage and retrieval system
- **File Operations**: CRUD operations for files and metadata
- **Query System**: Advanced file querying and filtering
- **Upload System**: File and payload upload with encryption
- **Security**: Encryption, decryption, and key management
- **WebSocket**: Real-time updates and notifications
- **Reactions**: Emoji and group reactions on content

This module is required for virtually all operations in the Homebase ecosystem.

---

## File Structure

```
core/
├── DotYouClient.ts              # Main API client
├── DotYouClient.test.ts         # Client tests
├── InterceptionEncryptionUtil.ts # URL/data encryption utilities
├── constants.ts                  # Core constants
├── core.ts                       # Module exports
├── DriveData/                    # Drive and file management
│   ├── Drive/
│   │   ├── DriveProvider.ts     # Drive operations
│   │   └── DriveTypes.ts        # Drive type definitions
│   ├── File/
│   │   ├── DriveFileManager.ts           # File management
│   │   ├── DriveFileProvider.ts          # File CRUD operations
│   │   ├── DriveFileByUniqueIdProvider.ts # File access by unique ID
│   │   ├── DriveFileByGlobalTransitIdProvider.ts # File access by transit ID
│   │   └── DriveFileTypes.ts             # File type definitions
│   ├── Query/
│   │   ├── DriveQueryService.ts  # File query service
│   │   └── DriveQueryTypes.ts    # Query type definitions
│   ├── Upload/
│   │   ├── DriveFileUploader.ts  # File upload service
│   │   ├── UploadHelpers.ts      # Upload utilities
│   │   └── DriveUploadTypes.ts   # Upload type definitions
│   └── SecurityHelpers.ts        # Encryption/decryption helpers
├── SecurityData/
│   ├── SecurityProvider.ts       # Security operations
│   └── SecurityTypes.ts          # Security type definitions
├── WebsocketData/
│   ├── WebsocketProvider.ts      # WebSocket client
│   └── WebsocketTypes.ts         # WebSocket type definitions
├── ReactionData/
│   ├── ReactionService.ts        # Emoji reactions
│   └── GroupReactionService.ts   # Group reactions
├── NotificationData/
│   └── PushNotificationsService.ts # Push notification service
└── ErrorHandling/
    └── KnownErrors.ts            # Known error types
```

---

## Key Components

### 1. DotYouClient

**Purpose**: The primary client for all API communication with the Homebase identity server.

**Key Features**:
- API type management (Owner, App, Guest)
- Authentication and shared secret management
- Request encryption and decryption
- Axios client creation with proper headers
- Endpoint construction

**API Types**:
- `ApiType.Owner`: Full owner access (requires authentication)
- `ApiType.App`: App-level access (requires app authentication)
- `ApiType.Guest`: Public/guest access (no authentication)

### 2. Drive System

**Purpose**: Manages drives (storage containers) and their configurations.

**Key Concepts**:
- **Drive**: A storage container with specific permissions and encryption
- **TargetDrive**: Specifies which drive to operate on
- **Drive Grants**: Permissions for accessing drives

### 3. File System

**Purpose**: Complete file lifecycle management including metadata, payloads, and thumbnails.

**Key Concepts**:
- **HomebaseFile**: Core file structure with metadata
- **FileId**: Unique identifier for files
- **GlobalTransitId**: Cross-identity file identifier
- **Payloads**: Encrypted file content
- **Thumbnails**: Preview images for files

### 4. Query System

**Purpose**: Advanced querying and filtering of files across drives.

**Key Capabilities**:
- Cursor-based pagination
- Multiple sort options
- File type filtering
- Tag-based filtering
- Date range queries

### 5. Upload System

**Purpose**: Handles file uploads with encryption, metadata, and thumbnails.

**Key Features**:
- Streaming uploads
- Automatic encryption
- Thumbnail generation
- Metadata embedding
- Progress tracking

---

## API Reference

### DotYouClient Class

#### Constructor

```typescript
constructor(options: BaseProviderOptions)
```

**Parameters**:
- `options.api`: `ApiType` - The API type (Owner, App, Guest)
- `options.sharedSecret`: `Uint8Array` (optional) - Shared secret for encryption
- `options.hostIdentity`: `string` - Target identity domain
- `options.loggedInIdentity`: `string` (optional) - Currently logged-in identity
- `options.headers`: `Record<string, string>` (optional) - Custom headers

**Example**:
```typescript
import { DotYouClient, ApiType } from '@homebase-id/js-lib/core';

const client = new DotYouClient({
  api: ApiType.Owner,
  sharedSecret: sharedSecretBytes,
  hostIdentity: 'alice.dotyou.cloud',
  loggedInIdentity: 'alice.dotyou.cloud'
});
```

#### Key Methods

##### getSharedSecret()

```typescript
getSharedSecret(): Uint8Array | undefined
```

Returns the shared secret used for encryption.

---

##### getType()

```typescript
getType(): ApiType
```

Returns the API type (Owner, App, or Guest).

---

##### getHostIdentity()

```typescript
getHostIdentity(): string
```

Returns the identity domain being accessed.

---

##### getLoggedInIdentity()

```typescript
getLoggedInIdentity(): string | undefined
```

Returns the currently logged-in identity.

---

##### isOwner()

```typescript
isOwner(): boolean
```

Returns `true` if the logged-in identity matches the host identity.

---

##### isAuthenticated()

```typescript
isAuthenticated(): boolean
```

Returns `true` if a shared secret is present.

---

##### getRoot()

```typescript
getRoot(): string
```

Returns the root URL (e.g., `https://alice.dotyou.cloud`).

---

##### getEndpoint()

```typescript
getEndpoint(): string
```

Returns the full API endpoint based on API type.

**Examples**:
- Owner: `https://alice.dotyou.cloud/api/owner/v1`
- App: `https://alice.dotyou.cloud/api/apps/v1`
- Guest: `https://alice.dotyou.cloud/api/guest/v1`

---

##### createAxiosClient()

```typescript
createAxiosClient(options?: createAxiosClientOptions): AxiosInstance
```

Creates an Axios client with encryption and authentication configured.

**Parameters**:
- `options.overrideEncryption`: `boolean` (optional) - Disable encryption
- `options.headers`: `Record<string, string>` (optional) - Additional headers
- `options.systemFileType`: `SystemFileType` (optional) - System file type header

**Example**:
```typescript
const axiosClient = client.createAxiosClient({
  headers: { 'X-Custom-Header': 'value' }
});

const response = await axiosClient.get('/some-endpoint');
```

---

### DriveProvider

Manages drive operations.

#### getDrives()

```typescript
async getDrives(
  dotYouClient: DotYouClient,
  options?: { type?: DriveType }
): Promise<TargetDrive[]>
```

Retrieves all drives accessible to the client.

**Parameters**:
- `dotYouClient`: DotYouClient instance
- `options.type`: Filter by drive type (optional)

**Example**:
```typescript
import { getDrives } from '@homebase-id/js-lib/core';

const drives = await getDrives(dotYouClient);
console.log(`Found ${drives.length} drives`);
```

---

#### getDrivesByType()

```typescript
async getDrivesByType(
  dotYouClient: DotYouClient,
  types: DriveDefinitionType[]
): Promise<TargetDrive[]>
```

Retrieves drives matching specific types.

---

### DriveFileProvider

Handles file CRUD operations.

#### getFileHeader()

```typescript
async getFileHeader(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string | undefined
): Promise<HomebaseFile | null>
```

Retrieves file metadata without payloads.

**Parameters**:
- `dotYouClient`: DotYouClient instance
- `targetDrive`: Target drive specification
- `fileId`: File identifier

**Returns**: File header or `null` if not found

**Example**:
```typescript
import { getFileHeader } from '@homebase-id/js-lib/core';

const file = await getFileHeader(dotYouClient, targetDrive, fileId);
if (file) {
  console.log('File tags:', file.fileMetadata.appData.tags);
}
```

---

#### getFileHeaderByUniqueId()

```typescript
async getFileHeaderByUniqueId(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  uniqueId: string
): Promise<HomebaseFile | null>
```

Retrieves file by unique ID (alternative identifier).

---

#### getContentFromHeaderOrPayload()

```typescript
async getContentFromHeaderOrPayload<T>(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  options?: { decrypt?: boolean }
): Promise<T | null>
```

Retrieves file content, attempting header first, then payload.

**Type Parameter**:
- `T`: Expected content type

**Returns**: Parsed content or `null`

**Example**:
```typescript
interface ChatMessage {
  text: string;
  authorId: string;
}

const message = await getContentFromHeaderOrPayload<ChatMessage>(
  dotYouClient,
  targetDrive,
  fileId
);

if (message) {
  console.log('Message:', message.text);
}
```

---

#### getPayloadBytes()

```typescript
async getPayloadBytes(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  key?: string,
  options?: { decrypt?: boolean; systemFileType?: SystemFileType }
): Promise<Uint8Array | ArrayBuffer | null>
```

Retrieves raw payload bytes.

**Parameters**:
- `key`: Payload key (optional, uses default if not provided)
- `options.decrypt`: Auto-decrypt payload
- `options.systemFileType`: System file type for headers

---

### DriveFileUploader

Handles file uploads.

#### uploadFile()

```typescript
async uploadFile(
  dotYouClient: DotYouClient,
  uploadInstructions: UploadInstructionSet,
  metadata: UploadFileMetadata,
  payloads: PayloadDescriptor[],
  thumbnails?: ThumbnailDescriptor[],
  onVersionConflict?: (e: AxiosError) => void,
  encrypt?: boolean
): Promise<UploadResult>
```

Uploads a file with metadata, payloads, and thumbnails.

**Parameters**:
- `uploadInstructions`: Drive and file targeting
- `metadata`: File metadata (tags, type, description, etc.)
- `payloads`: Array of payload descriptors (content)
- `thumbnails`: Array of thumbnail descriptors (optional)
- `onVersionConflict`: Callback for version conflicts
- `encrypt`: Enable encryption (default: true)

**Example**:
```typescript
import { uploadFile } from '@homebase-id/js-lib/core';

const result = await uploadFile(
  dotYouClient,
  {
    targetDrive: myDrive,
    storageOptions: { overwriteFileId: existingFileId }
  },
  {
    appData: {
      tags: ['document', 'important'],
      content: { text: 'Hello World' }
    },
    versionTag: 'v1'
  },
  [
    {
      key: 'main',
      contentType: 'text/plain',
      content: new Uint8Array([/* data */])
    }
  ],
  [] // no thumbnails
);

console.log('Uploaded file:', result.file.fileId);
```

---

### DriveQueryService

Queries files across drives.

#### queryBatch()

```typescript
async queryBatch(
  dotYouClient: DotYouClient,
  params: HomebaseFileQueryParams
): Promise<HomebaseFile[]>
```

Queries files with pagination and filtering.

**Parameters**:
- `params.targetDrive`: Drive to query
- `params.fileType`: Filter by file type (optional)
- `params.tagsMatchAtLeastOne`: Filter by tags (OR) (optional)
- `params.tagsMatchAll`: Filter by tags (AND) (optional)
- `params.clientUniqueIdAtLeastOne`: Filter by unique IDs (optional)
- `params.maxRecords`: Max results per page
- `params.cursorState`: Pagination cursor (optional)

**Example**:
```typescript
import { queryBatch } from '@homebase-id/js-lib/core';

const files = await queryBatch(dotYouClient, {
  targetDrive: chatDrive,
  tagsMatchAtLeastOne: ['unread'],
  maxRecords: 50
});

console.log(`Found ${files.length} unread messages`);
```

---

#### queryBatchCollection()

```typescript
async queryBatchCollection(
  dotYouClient: DotYouClient,
  params: HomebaseFileQueryParams
): Promise<BatchQueryResultPage>
```

Queries with full pagination support (includes cursor for next page).

**Returns**:
- `searchResults`: Array of files
- `cursorState`: Cursor for next page
- `queryTime`: Query execution time
- `includeMetadataHeader`: Whether metadata is included

**Example**:
```typescript
let cursor: string | undefined;
const allFiles: HomebaseFile[] = [];

do {
  const page = await queryBatchCollection(dotYouClient, {
    targetDrive: photoDrive,
    fileType: ['image/jpeg', 'image/png'],
    maxRecords: 100,
    cursorState: cursor
  });
  
  allFiles.push(...page.searchResults);
  cursor = page.cursorState;
} while (cursor);

console.log(`Total photos: ${allFiles.length}`);
```

---

### SecurityProvider

Manages encryption and security keys.

#### getSecurityContext()

```typescript
async getSecurityContext(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string
): Promise<SecurityGroupType[]>
```

Retrieves security context for a file.

---

#### getDriveGrants()

```typescript
async getDriveGrants(
  dotYouClient: DotYouClient
): Promise<DriveGrantResponse[]>
```

Retrieves all drive grants (permissions) for the current identity.

**Example**:
```typescript
import { getDriveGrants } from '@homebase-id/js-lib/core';

const grants = await getDriveGrants(dotYouClient);
grants.forEach(grant => {
  console.log(`Drive: ${grant.permissionSet.driveAlias}, Keys: ${grant.permissionSet.keys.length}`);
});
```

---

### WebsocketProvider

Provides real-time updates via WebSocket.

#### openWebsocket()

```typescript
openWebsocket(
  dotYouClient: DotYouClient,
  handlers: WebsocketHandlers
): WebSocket
```

Opens a WebSocket connection for real-time notifications.

**Parameters**:
- `handlers.onMessage`: Message handler
- `handlers.onOpen`: Connection open handler (optional)
- `handlers.onClose`: Connection close handler (optional)
- `handlers.onError`: Error handler (optional)

**Example**:
```typescript
import { openWebsocket } from '@homebase-id/js-lib/core';

const ws = openWebsocket(dotYouClient, {
  onMessage: (notification) => {
    console.log('File updated:', notification.header.fileId);
    // Refresh UI or refetch data
  },
  onOpen: () => console.log('WebSocket connected'),
  onError: (error) => console.error('WebSocket error:', error)
});

// Later: close the connection
ws.close();
```

---

### ReactionService

Manages emoji reactions on files.

#### addReaction()

```typescript
async addReaction(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  reaction: string
): Promise<void>
```

Adds an emoji reaction to a file.

**Example**:
```typescript
import { addReaction } from '@homebase-id/js-lib/core';

await addReaction(dotYouClient, postDrive, postFileId, '👍');
```

---

#### removeReaction()

```typescript
async removeReaction(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  reaction: string
): Promise<void>
```

Removes an emoji reaction.

---

#### getReactionSummary()

```typescript
async getReactionSummary(
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string
): Promise<ReactionSummary>
```

Gets reaction summary (counts per emoji).

**Returns**:
```typescript
interface ReactionSummary {
  reactions: {
    [emoji: string]: {
      count: number;
      reactors: string[]; // identity domains
    }
  };
  myReactions: string[]; // emojis you reacted with
}
```

---

## Type Definitions

### TargetDrive

```typescript
interface TargetDrive {
  alias: string;      // Drive alias/identifier
  type: string;       // Drive type identifier
}
```

**Example**:
```typescript
const chatDrive: TargetDrive = {
  alias: 'chat-messages',
  type: 'dd95d0e6-ce4a-4e15-8118-d49f89b67ba6'
};
```

---

### HomebaseFile

```typescript
interface HomebaseFile {
  fileId: string;
  fileState: number;
  fileSystemType: string;
  fileMetadata: {
    appData: {
      uniqueId?: string;
      tags?: string[];
      content?: unknown;
      fileType?: number;
      dataType?: number;
      userDate?: number;
      groupId?: string;
      archivalStatus?: number;
    };
    reactionPreview?: {
      reactions: Record<string, number>;
    };
    isEncrypted: boolean;
    versionTag?: string;
  };
  serverMetadata?: {
    accessControlList: ACL;
  };
  sharedSecretEncryptedKeyHeader?: EncryptedKeyHeader;
  priority?: number;
}
```

---

### UploadFileMetadata

```typescript
interface UploadFileMetadata {
  versionTag?: string;
  allowDistribution?: boolean;
  appData: {
    uniqueId?: string;
    tags?: string[];
    content?: unknown;
    fileType?: number;
    dataType?: number;
    userDate?: number;
    groupId?: string;
    archivalStatus?: number;
  };
  isEncrypted?: boolean;
  accessControlList?: AccessControlList;
}
```

---

### PayloadDescriptor

```typescript
interface PayloadDescriptor {
  key: string;                    // Payload identifier
  contentType: string;            // MIME type
  content: Uint8Array | ArrayBuffer | Blob | File;
  descriptorContent?: string;     // Additional metadata
  previewThumbnail?: ThumbnailFile; // Preview image
}
```

---

### HomebaseFileQueryParams

```typescript
interface HomebaseFileQueryParams {
  targetDrive: TargetDrive;
  fileType?: number[];
  tagsMatchAtLeastOne?: string[];
  tagsMatchAll?: string[];
  clientUniqueIdAtLeastOne?: string[];
  groupIdAtLeastOne?: string[];
  archivalStatus?: number;
  maxRecords?: number;
  cursorState?: string;
  includeMetadataHeader?: boolean;
}
```

---

## Common Patterns

### Pattern 1: Initialize Client and Query Files

```typescript
import { DotYouClient, ApiType, queryBatch } from '@homebase-id/js-lib/core';

// Create authenticated client
const client = new DotYouClient({
  api: ApiType.Owner,
  sharedSecret: mySharedSecret,
  hostIdentity: 'alice.dotyou.cloud'
});

// Query recent files
const files = await queryBatch(client, {
  targetDrive: { alias: 'my-app-data', type: 'app-type-id' },
  tagsMatchAtLeastOne: ['important'],
  maxRecords: 20
});

// Process files
files.forEach(file => {
  console.log('File ID:', file.fileId);
  console.log('Tags:', file.fileMetadata.appData.tags);
});
```

---

### Pattern 2: Upload File with Metadata

```typescript
import { uploadFile, stringToUint8Array } from '@homebase-id/js-lib/core';

const content = stringToUint8Array(JSON.stringify({ message: 'Hello!' }));

const result = await uploadFile(
  client,
  {
    targetDrive: chatDrive,
    storageOptions: { overwriteFileId: undefined } // new file
  },
  {
    versionTag: '1.0',
    appData: {
      uniqueId: crypto.randomUUID(),
      tags: ['chat', 'message'],
      content: { type: 'text' },
      userDate: Date.now()
    }
  },
  [
    {
      key: 'message',
      contentType: 'application/json',
      content: content
    }
  ]
);

console.log('Uploaded:', result.file.fileId);
```

---

### Pattern 3: Real-time Updates with WebSocket

```typescript
import { openWebsocket } from '@homebase-id/js-lib/core';

const ws = openWebsocket(client, {
  onMessage: async (notification) => {
    // File was created/updated/deleted
    const { fileId } = notification.header;
    
    // Refetch the file
    const updated = await getFileHeader(client, chatDrive, fileId);
    
    // Update UI
    updateChatMessage(updated);
  },
  onOpen: () => console.log('Connected'),
  onClose: () => console.log('Disconnected')
});

// Don't forget to close when component unmounts
// ws.close();
```

---

### Pattern 4: Paginated Query

```typescript
import { queryBatchCollection } from '@homebase-id/js-lib/core';

async function fetchAllFiles(drive: TargetDrive) {
  let cursor: string | undefined;
  const allFiles: HomebaseFile[] = [];
  
  do {
    const page = await queryBatchCollection(client, {
      targetDrive: drive,
      maxRecords: 100,
      cursorState: cursor
    });
    
    allFiles.push(...page.searchResults);
    cursor = page.cursorState;
    
    console.log(`Fetched ${allFiles.length} files so far...`);
  } while (cursor);
  
  return allFiles;
}

const allMyFiles = await fetchAllFiles(myDrive);
```

---

### Pattern 5: Error Handling

```typescript
import { getFileHeader } from '@homebase-id/js-lib/core';
import { AxiosError } from 'axios';

try {
  const file = await getFileHeader(client, drive, fileId);
  
  if (!file) {
    console.log('File not found');
    return;
  }
  
  // Process file
  processFile(file);
  
} catch (error) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401) {
      console.error('Authentication failed');
      // Redirect to login
    } else if (error.response?.status === 403) {
      console.error('Access denied');
    } else {
      console.error('API error:', error.message);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Best Practices

### ✅ DO:

1. **Always authenticate before accessing owner/app APIs**
   ```typescript
   if (!client.isAuthenticated()) {
     throw new Error('Must be authenticated');
   }
   ```

2. **Use cursor-based pagination for large datasets**
   ```typescript
   // Good: handles millions of files
   const page = await queryBatchCollection(client, { maxRecords: 100 });
   ```

3. **Close WebSocket connections when done**
   ```typescript
   useEffect(() => {
     const ws = openWebsocket(client, handlers);
     return () => ws.close(); // cleanup
   }, []);
   ```

4. **Handle version conflicts gracefully**
   ```typescript
   await uploadFile(client, instructions, metadata, payloads, [], (error) => {
     console.log('Version conflict, retrying with latest version');
     // Fetch latest and retry
   });
   ```

5. **Cache drive definitions**
   ```typescript
   const drives = await getDrives(client);
   localStorage.setItem('drives', JSON.stringify(drives));
   ```

### ❌ DON'T:

1. **Don't hardcode shared secrets**
   ```typescript
   // Bad
   const secret = new Uint8Array([1, 2, 3, ...]);
   
   // Good: derive from authentication
   const secret = await deriveSharedSecret(eccKeyPair, serverPublicKey);
   ```

2. **Don't fetch files one-by-one in loops**
   ```typescript
   // Bad: N+1 queries
   for (const id of fileIds) {
     const file = await getFileHeader(client, drive, id);
   }
   
   // Good: batch query
   const files = await queryBatch(client, {
     targetDrive: drive,
     clientUniqueIdAtLeastOne: fileIds
   });
   ```

3. **Don't ignore encryption**
   ```typescript
   // Bad: disabling encryption without reason
   await uploadFile(client, instructions, metadata, payloads, [], undefined, false);
   
   // Good: use encryption (default)
   await uploadFile(client, instructions, metadata, payloads);
   ```

4. **Don't store files in memory unnecessarily**
   ```typescript
   // Bad: loading all files at once
   const allFiles = await fetchAllFiles(drive); // millions of files!
   
   // Good: process in chunks
   let cursor;
   do {
     const page = await queryBatchCollection(client, { maxRecords: 100, cursorState: cursor });
     await processBatch(page.searchResults);
     cursor = page.cursorState;
   } while (cursor);
   ```

---

## Performance Tips

1. **Batch Operations**: Use `queryBatchCollection` instead of individual `getFileHeader` calls
2. **Limit Payload Fetching**: Use `getFileHeader` for metadata-only queries
3. **WebSocket for Updates**: Avoid polling; use WebSocket for real-time changes
4. **Pagination**: Always use `maxRecords` and cursor-based pagination
5. **Caching**: Cache drive definitions and file headers when appropriate

---

## Security Considerations

1. **Shared Secret Protection**: Never log or expose shared secrets
2. **Encryption by Default**: Always encrypt sensitive data
3. **ACL Management**: Set proper access control lists on files
4. **HTTPS Only**: All API calls must use HTTPS
5. **Token Rotation**: Refresh authentication tokens before expiry

---

## Troubleshooting

### Issue: "Failed to authenticate"

**Cause**: Invalid or expired shared secret

**Solution**:
```typescript
// Re-authenticate
const newSecret = await performAuthentication();
const newClient = new DotYouClient({
  ...oldOptions,
  sharedSecret: newSecret
});
```

---

### Issue: "Version conflict on upload"

**Cause**: File was modified between fetch and upload

**Solution**:
```typescript
await uploadFile(client, instructions, metadata, payloads, [], async (error) => {
  // Fetch latest version
  const latest = await getFileHeader(client, drive, fileId);
  
  // Update version tag
  metadata.versionTag = latest.fileMetadata.versionTag;
  
  // Retry upload
  await uploadFile(client, instructions, metadata, payloads);
});
```

---

### Issue: "Query returns no results"

**Cause**: Incorrect tags or missing permissions

**Solution**:
```typescript
// Check drive grants
const grants = await getDriveGrants(client);
console.log('Available drives:', grants.map(g => g.permissionSet.driveAlias));

// Verify tags are exact matches
const files = await queryBatch(client, {
  targetDrive: drive,
  tagsMatchAtLeastOne: ['exact-tag-name'] // case-sensitive!
});
```

---

## Related Documentation

- [AUTHENTICATION.md](../AUTHENTICATION.md) - Authentication and key management
- [AUTH_MODULE.md](./AUTH_MODULE.md) - Authentication providers
- [HELPERS_MODULE.md](./HELPERS_MODULE.md) - Encryption and utility helpers
- [NETWORK_MODULE.md](./NETWORK_MODULE.md) - Social connections and permissions

---

**Last Updated**: October 31, 2025  
**Module Path**: `packages/libs/js-lib/src/core/`
