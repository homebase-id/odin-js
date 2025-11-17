# Workspace instructions for AI assistants

These instructions help AI coding assistants read, navigate, and safely modify this monorepo. Keep answers concise, cite exact file paths, and prefer small, verifiable edits.

## Quick facts

- Monorepo root: `odin-js`
- Key library: `packages/libs/js-lib` (public API for apps)
- Example apps: `packages/apps/*`
- Docs: `docs/` (product and API docs)
- Run tasks:
  - JS apps: VS Code task “Run odin-js” → `npm start` in repo root
  - Backend (external): VS Code task “Run odin-core” in sibling repo `../dotYouCore`

## Golden rules

1. Prefer existing providers and helpers. Don’t reimplement crypto or request signing.
2. Use `DotYouClient` from `packages/libs/js-lib/src/core/DotYouClient.ts` for all API calls.
3. Respect pagination and cursors; never fetch unbounded lists.
4. For destructive ops (delete/modify), gate behind a confirmation flag and document consequences.
5. Keep public API stable. If you change a type or function, update affected exports and docs.
6. In Node, avoid browser-only utilities (image/video processing) unless polyfilled.
7. Log minimally; never print secrets. Use structured errors from KnownErrors when available.

## Where things live

- `packages/libs/js-lib/src/index.ts`: top-level public exports (helpers, core, network, profile, public, peer)
- `packages/libs/js-lib/src/core/`:
  - `DotYouClient.ts`: API client, encryption/decryption interceptors
  - Drive, File, Query, Upload providers and types
  - Security, Notifications, Websocket, Reactions
- `packages/libs/js-lib/src/public/`: public-facing file and posts APIs
- `packages/libs/js-lib/src/network/`: owner-scoped operations (connections, circles, contacts, follows)
- `packages/libs/js-lib/src/profile/`: profile attributes and definitions
- `packages/libs/js-lib/src/media/`: thumbnails, link preview, video (mostly browser-centric)
- `docs/api/v2/`: HTTP API documentation (reference for endpoints/data types)

## Common tasks

- Fetch recent posts: use `public/posts/PostProvider.ts` → `getRecentPosts`.
- Fetch posts in channel: `getPosts` with `channelId`, `type`, `includeDrafts`.
- Get post by id/slug/GTID: `getPostByFileId`, `getPostBySlug`, `getPostByGlobalTransitId`.
- Query files directly: `core/DriveData/Query/DriveQueryService.ts` via `queryBatch`.
- Delete a post and its comments: `removePost` (handles comment cleanup).

## Environment and auth

- Build `DotYouClient` with:
  - `api`: `ApiType.App` or `ApiType.Owner`
  - `hostIdentity`: e.g., `example.dotyou.cloud`
  - `sharedSecret: Uint8Array` (base64-decoded)
  - `headers.Authorization: 'Bearer <clientAuthToken>'`
- **For complete authentication implementation**, see [AUTHENTICATION.md](./AUTHENTICATION.md) which covers:
  - YouAuth protocol and ECC key exchange flow
  - Token finalization and storage
  - React hooks for auth validation
  - Drive and circle permissions
  - Security best practices
- If you must provision credentials, see `auth/providers/AuthenticationProvider.ts` (`finalizeAuthentication`). Prefer provisioning outside app runtime.

## Patterns to follow

- Encryption: Let `DotYouClient.createAxiosClient()` handle it. Don’t bypass unless `overrideEncryption: true` is required for specific endpoints.
- Data access: Prefer `getContentFromHeaderOrPayload` to hydrate content safely.
- Errors: Use `handleErrorResponse` and `ErrorHandling/KnownErrors` for consistent messaging.
- Sorting/pagination: Use `ordering`, `sorting`, `maxRecords`, and propagate/return `cursorState`.

## When adding new APIs

- Place provider in appropriate domain folder.
- Add strongly typed inputs/outputs; export from the relevant `index.ts` (e.g., `src/public/public.ts`).
- Add minimal tests (happy path + one edge case).
- Update `docs/llm/CODE_MAP.md` (module map) and `docs/llm/ARCHITECTURE.md` if architecture changes.

---

Use this file as the first context for AI assistants. For deep dives, see the sections below.

## Implementation guidelines for AI assistants

When implementing features autonomously:

### 1. Research first

- Read relevant provider files completely before making changes
- Check existing implementations for similar patterns
- Search for usage examples with `grep_search` or `semantic_search`
- Never assume - verify types, function signatures, and return values

### 2. Type safety

- Always import types from their source modules
- Use generics where appropriate (e.g., `HomebaseFile<T>`)
- Export new types from domain `index.ts` files
- Check `DriveFileTypes.ts`, `DriveQueryTypes.ts`, `PostTypes.ts` for existing types

### 3. Error handling

- Use `handleErrorResponse` from `core/DriveData/SecurityHelpers.ts`
- Import known errors from `helpers/ErrorHandling/KnownErrors.ts`
- Return `null` or throw typed errors; avoid throwing raw strings
- Log errors with context: `console.error('[ProviderName]', error)`

### 4. API calls

- Always use `dotYouClient.createAxiosClient()` - never bypass
- Let interceptors handle encryption/decryption automatically
- Use `validateStatus: () => true` for calls where 404/403 are expected
- Check response `.status` explicitly when needed

### 5. Pagination

- Accept `cursorState?: string`, `maxRecords?: number` params
- Return `{ results: T[], cursorState?: string }` structure
- Pass cursor through to `queryBatch` / `queryBatchCollection`
- Document when pagination is NOT supported

### 6. Drive and file operations

- Queries: Use `DriveQueryService.queryBatch` with typed `FileQueryParams`
- Headers only: Set `includeHeaderContent: false` for performance
- Full payload: Use `getContentFromHeaderOrPayload` to hydrate
- Deletes: Consider cascading (e.g., post → comments)

### 7. Testing your changes

- Run `npm run build:libs` after editing js-lib
- Check for TypeScript errors with `get_errors` tool
- Test in a consuming app (owner-app, feed-app, etc.)
- Verify encryption works by checking network traffic

### 8. Code organization

- Place new providers in appropriate domain folder
- Export from domain `index.ts` (e.g., `src/public/public.ts`)
- Keep business logic in providers, not in `DotYouClient`
- Use helpers folder for pure utility functions

### 9. Naming conventions

- Providers: `*Provider.ts` (e.g., `PostProvider.ts`)
- Managers: `*Manager.ts` (e.g., `DriveFileManager.ts`)
- Types: `*Types.ts` (e.g., `PostTypes.ts`)
- Functions: camelCase, descriptive (e.g., `getPostByGlobalTransitId`)

### 10. Documentation

- Add JSDoc comments for public APIs
- Document parameters, return types, and exceptions
- Include usage examples for complex functions
- Update this file if you add major new capabilities

## Architecture overview

This repo centers on `packages/libs/js-lib`:

- Core: `src/core/` provides `DotYouClient`, encryption, Drive/File/Query/Upload, Security, Websocket, Reactions, Notifications.
- Public: `src/public/` provides posts and file helpers for public content.
- Network (owner): `src/network/` provides connections, circles, contacts, follows.
- Profile: `src/profile/` provides attribute data and profile definitions.
- Media: `src/media/` provides thumbnails, link preview, video (mostly browser-oriented).

Request lifecycle (core):

1. Instantiate `DotYouClient` with `api`, `hostIdentity`, optional `sharedSecret`, and `Authorization` header.
2. Call `createAxiosClient()`.
3. Interceptors (when `sharedSecret` present): encrypt requests (non-GET), encrypt GET URLs, decrypt responses.
4. Domain providers use this client; return typed results.

Data patterns:

- Use `queryBatch`/`queryBatchCollection`; keep `cursorState` for pagination.
- Hydrate content via `getContentFromHeaderOrPayload`.
- Respect `ordering`/`sorting`.

Security:

- Do not log secrets; rely on `DotYouClient` crypto.
- Gate owner-only APIs; see `assertIfDotYouClientIsOwner*`.
- Avoid browser-only modules in Node.

Common flows:

- Posts: list recent/by channel, get by id/slug/GTID, delete with comment cascade.
- Files: headers/payloads/delete/upload, tag/group/dataType queries.
- Profile: attributes and definitions.
- Network (owner): manage connections, circles, contacts, follows.

## Code map (modules and key files)

Entrypoints:

- `packages/libs/js-lib/src/index.ts` — top-level exports (helpers, core, network, profile, public, peer)
- `packages/libs/js-lib/src/core/core.ts` — re-exports core providers/types
- `packages/libs/js-lib/src/core/DotYouClient.ts` — API client + crypto interceptors

Core (selected):

- Drive: `core/DriveData/Drive/{DriveProvider,DriveTypes}.ts`
- File: `core/DriveData/File/{DriveFileProvider,DriveFileManager,DriveFileTypes}.ts`
- Query: `core/DriveData/Query/{DriveQueryService,DriveQueryTypes}.ts`
- Upload: `core/DriveData/Upload/{DriveFileUploader,DriveUploadTypes}.ts`
- Security helpers: `core/DriveData/SecurityHelpers.ts`
- Encryption utils: `core/InterceptionEncryptionUtil.ts`

Public APIs:

- Posts: `public/posts/{PostProvider,PostTypes}.ts`, `public/posts/Channel/PostChannelManager.ts`
- Files: `public/file/{FileProvider,FilePublishManager,ProfileCardManager}.ts`

Network (owner):

- Connections: `network/connection/*`
- Circles: `network/circle/*`
- Contacts: `network/contact/*`
- Follows: `network/follow/*`
- Troubleshooting: `network/troubleshooting/*`

Profile:

- Attributes: `profile/AttributeData/*`
- Definitions: `profile/ProfileData/*`

Media:

- Thumbnails: `media/Thumbs/*`
- Image/Video: `media/{ImageProvider.ts,Video/*}` (browser/WASM oriented)
- Link preview: `media/Link/LinkPreviewProvider.ts`

Auth helpers:

- `auth/providers/AuthenticationProvider.ts` — ECC exchange; token/shared secret retrieval
- Keys: `auth/providers/{EccKeyProvider,IdentityProvider,RsaKeyProvider}.ts`

Docs:

- HTTP API: `docs/api/v2/*`

## Runbook (common dev flows)

Run apps (from repo root):

- VS Code task: “Run odin-js” → runs `npm start` (Vite dev server)
- VS Code task: “Run odin-core” → runs sibling backend `../dotYouCore` (if present)

Auth/env for programmatic access:

- Build `DotYouClient` with `ApiType.App` (or Owner), `hostIdentity`, `Authorization: Bearer <token>`, and base64-decoded `sharedSecret` (as `Uint8Array`).
- Provision credentials using `auth/providers/AuthenticationProvider.ts` (outside runtime preferred), then inject at startup.

Fetching posts:

- Recent across channels: `public/posts/PostProvider.getRecentPosts`
- In channel: `getPosts(channelId, type?, includeDrafts, cursorState?, pageSize?)`
- By id/slug/GTID: `getPostByFileId`, `getPostBySlug`, `getPostByGlobalTransitId`

Files and queries:

- Query: `core/DriveData/Query/DriveQueryService.queryBatch`
- Hydrate content: `getContentFromHeaderOrPayload`
- Delete: `deleteFile` or `public/posts/PostProvider.removePost` (cascades comments)

## Glossary

- Drive: Logical storage area under an identity; addressed by type + alias (`TargetDrive`).
- TargetDrive: `{ type, alias }` identifying a drive.
- File: Item in a drive; has header metadata and optional payload.
- GlobalTransitId (GTID): Global identifier for cross-system referencing.
- Channel: A blog/feed channel; maps to a target drive via `PostChannelManager`.
- PostType: Logical kind of post; mapped to data type via `postTypeToDataType`.
- HomebaseFile<T>: Typed file structure with `fileMetadata.appData.content` strongly typed to `T`.
- SharedSecret: Symmetric key used for encryption/decryption by `DotYouClient`.
- ApiType: Client scope — `Owner`, `App`, or `Guest`.
- SystemFileType: System classification (e.g., `Comment`) used in queries and cascading deletes.

## Common implementation patterns

### Pattern: Create a new query provider

```typescript
// In src/public/myfeature/MyFeatureProvider.ts
import { DotYouClient } from '../../core/DotYouClient';
import { TargetDrive, HomebaseFile } from '../../core/DriveData/File/DriveFileTypes';
import { queryBatch } from '../../core/DriveData/Query/DriveQueryService';
import { getContentFromHeaderOrPayload } from '../../core/DriveData/SecurityHelpers';

export type MyFeatureContent = {
  title: string;
  description?: string;
  // ... your fields
};

export const getMyFeatures = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  cursorState?: string,
  maxRecords = 50
): Promise<{ results: HomebaseFile<MyFeatureContent>[]; cursorState?: string }> => {
  const response = await queryBatch(dotYouClient, {
    targetDrive,
    fileType: [MY_FEATURE_DATA_TYPE],
    clientUniqueId: 'my-feature-query',
    includeHeaderContent: true, // or false if you only need metadata
    cursorState,
    maxRecords,
  });

  const results = await Promise.all(
    response.searchResults.map(async (file) => {
      const content = await getContentFromHeaderOrPayload<MyFeatureContent>(
        dotYouClient,
        targetDrive,
        file
      );
      return { ...file, fileMetadata: { ...file.fileMetadata, appData: { content } } };
    })
  );

  return { results, cursorState: response.cursorState };
};
```

Export from `src/public/public.ts`:

```typescript
export * from './myfeature/MyFeatureProvider';
```

### Pattern: Create/upload a file

```typescript
import { uploadFile } from '../../core/DriveData/Upload/DriveFileUploader';
import {
  UploadFileMetadata,
  UploadInstructionSet,
} from '../../core/DriveData/Upload/DriveUploadTypes';
import { stringifyToQueryString } from '../../helpers/DataUtil';

export const createMyFeature = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  content: MyFeatureContent,
  userDate?: number
): Promise<HomebaseFile<MyFeatureContent> | null> => {
  const metadata: UploadFileMetadata = {
    versionTag: '1.0',
    appData: {
      uniqueId: crypto.randomUUID(), // or generate your own
      userDate: userDate || Date.now(),
      content,
    },
    isEncrypted: true,
    accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner }, // or adjust
  };

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      drive: targetDrive,
      overwriteFileId: undefined, // or provide to update
    },
  };

  const response = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    undefined, // payload if needed
    undefined, // thumbnails
    undefined // additional metadata
  );

  if (!response) return null;

  // Fetch the created file back
  return getMyFeatureByFileId(dotYouClient, targetDrive, response.file.fileId);
};
```

### Pattern: Update an existing file

```typescript
export const updateMyFeature = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  updates: Partial<MyFeatureContent>
): Promise<HomebaseFile<MyFeatureContent> | null> => {
  // 1. Fetch current file
  const current = await getMyFeatureByFileId(dotYouClient, targetDrive, fileId);
  if (!current) return null;

  // 2. Merge updates
  const updatedContent = { ...current.fileMetadata.appData.content, ...updates };

  // 3. Re-upload with overwriteFileId
  const metadata: UploadFileMetadata = {
    ...current.fileMetadata,
    appData: {
      ...current.fileMetadata.appData,
      content: updatedContent,
    },
  };

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      drive: targetDrive,
      overwriteFileId: fileId, // KEY: this updates instead of creating new
    },
  };

  await uploadFile(dotYouClient, instructionSet, metadata);
  return getMyFeatureByFileId(dotYouClient, targetDrive, fileId);
};
```

### Pattern: Delete with cascading

```typescript
import { deleteFile } from '../../core/DriveData/File/DriveFileProvider';

export const deleteMyFeature = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  deleteRelated = true
): Promise<void> => {
  if (deleteRelated) {
    // Query related files (e.g., comments, reactions)
    const related = await queryBatch(dotYouClient, {
      targetDrive,
      fileType: [RELATED_DATA_TYPE],
      clientUniqueId: 'delete-related-query',
      includeHeaderContent: false,
      tagsMatchAll: [fileId], // or use groupId, etc.
    });

    // Delete related first
    await Promise.all(
      related.searchResults.map((file) => deleteFile(dotYouClient, targetDrive, file.fileId))
    );
  }

  // Delete main file
  await deleteFile(dotYouClient, targetDrive, fileId);
};
```

### Pattern: WebSocket notifications

```typescript
import { Subscribe, Unsubscribe } from '../../core/WebsocketData/NotificationProvider';
import { TypedConnectionNotification } from '../../core/WebsocketData/WebsocketTypes';

export const subscribeToMyFeatureUpdates = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  onUpdate: (file: HomebaseFile<MyFeatureContent>) => void,
  onDisconnect?: () => void,
  onReconnect?: () => void
): Promise<void> => {
  const handler = async (client: DotYouClient, notification: TypedConnectionNotification) => {
    if (
      notification.notificationType !== 'fileAdded' &&
      notification.notificationType !== 'fileModified'
    ) {
      return;
    }

    // Filter by drive/type
    if (!drivesEqual(notification.targetDrive, targetDrive)) return;
    if (notification.header?.fileMetadata?.appData?.fileType !== MY_FEATURE_DATA_TYPE) return;

    // Fetch full file and notify
    const file = await getMyFeatureByFileId(client, targetDrive, notification.header.fileId);
    if (file) onUpdate(file);
  };

  return Subscribe(
    dotYouClient,
    [targetDrive],
    handler,
    onDisconnect,
    onReconnect,
    undefined, // args for React Native
    'my-feature-subscription' // refId for debugging
  );
};

export const unsubscribeFromMyFeatureUpdates = (handler: Function) => {
  Unsubscribe(handler);
};
```

### Pattern: Peer-to-peer WebSocket (guest access)

```typescript
import {
  SubscribeOverPeer,
  UnsubscribeOverPeer,
} from '../../peer/WebsocketData/WebsocketProviderOverPeer';

export const subscribeToPeerMyFeatures = async (
  dotYouClient: DotYouClient, // Your owner client
  peerOdinId: string, // Remote identity to connect to
  targetDrive: TargetDrive,
  onUpdate: (file: HomebaseFile<MyFeatureContent>) => void
): Promise<void> => {
  const handler = async (
    guestClient: DotYouClient, // Auto-created guest client for peer
    notification: TypedConnectionNotification
  ) => {
    if (notification.notificationType !== 'fileAdded') return;
    if (!drivesEqual(notification.targetDrive, targetDrive)) return;

    // Use guestClient to fetch from peer
    const file = await getMyFeatureByFileId(guestClient, targetDrive, notification.header.fileId);
    if (file) onUpdate(file);
  };

  return SubscribeOverPeer(
    dotYouClient,
    peerOdinId,
    [targetDrive],
    handler,
    undefined, // onDisconnect
    undefined, // onReconnect
    undefined, // args
    'peer-my-feature-subscription'
  );
};
```

### Pattern: Handle authentication in Node/server

```typescript
import { ApiType, DotYouClient } from './core/DotYouClient';
import { base64ToUint8Array } from './helpers/helpers';

// From environment or secure storage
const IDENTITY = process.env.HOMEBASE_IDENTITY!;
const CLIENT_AUTH_TOKEN = process.env.HOMEBASE_CLIENT_TOKEN!;
const SHARED_SECRET_BASE64 = process.env.HOMEBASE_SHARED_SECRET!;

const client = new DotYouClient({
  api: ApiType.Owner, // or ApiType.App for app tokens
  hostIdentity: IDENTITY,
  sharedSecret: base64ToUint8Array(SHARED_SECRET_BASE64),
  headers: {
    Authorization: `Bearer ${CLIENT_AUTH_TOKEN}`,
  },
});

// Now use client for all operations
const posts = await getRecentPosts(client, targetDrive);
```

### Pattern: Guest access (public reads)

```typescript
const guestClient = new DotYouClient({
  api: ApiType.Guest,
  hostIdentity: 'someidentity.dotyou.cloud',
  // No sharedSecret or Authorization needed for public data
});

// Only works for publicly accessible drives/files
const publicPosts = await getRecentPosts(guestClient, PUBLIC_DRIVE);
```

### Pattern: Check if operation requires owner

```typescript
import { assertIfDotYouClientIsOwner } from './core/DriveData/SecurityHelpers';

export const dangerousDeleteAllFiles = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive
): Promise<void> => {
  // Throws if not owner
  assertIfDotYouClientIsOwner(dotYouClient);

  // Proceed with owner-only operation
  // ...
};
```

### Pattern: Batch operations with concurrency limit

```typescript
// For large operations, limit concurrency to avoid overwhelming the server
import pLimit from 'p-limit'; // or implement your own

const limit = pLimit(5); // Max 5 concurrent requests

const batchDelete = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileIds: string[]
): Promise<void> => {
  await Promise.all(
    fileIds.map((fileId) => limit(() => deleteFile(dotYouClient, targetDrive, fileId)))
  );
};
```

## Quick reference: Key imports

```typescript
// Core client
import { DotYouClient, ApiType } from './core/DotYouClient';

// Types
import { TargetDrive, HomebaseFile, DriveDefinition } from './core/DriveData/File/DriveFileTypes';
import { FileQueryParams } from './core/DriveData/Query/DriveQueryTypes';
import { UploadFileMetadata, UploadInstructionSet } from './core/DriveData/Upload/DriveUploadTypes';
import { SecurityGroupType } from './core/DriveData/File/DriveFileTypes';

// Query & fetch
import { queryBatch, queryBatchCollection } from './core/DriveData/Query/DriveQueryService';
import { getContentFromHeaderOrPayload } from './core/DriveData/SecurityHelpers';
import { getFileHeaderByUniqueId } from './core/DriveData/File/DriveFileProvider';

// Upload & delete
import { uploadFile } from './core/DriveData/Upload/DriveFileUploader';
import { deleteFile } from './core/DriveData/File/DriveFileProvider';

// Notifications
import { Subscribe, Unsubscribe } from './core/WebsocketData/NotificationProvider';
import {
  SubscribeOverPeer,
  UnsubscribeOverPeer,
} from './peer/WebsocketData/WebsocketProviderOverPeer';

// Helpers
import {
  getRandom16ByteArray,
  base64ToUint8Array,
  stringifyToQueryString,
} from './helpers/helpers';
import { drivesEqual } from './helpers/helpers';
```

## Debugging checklist

When something doesn't work:

1. **Auth issues**: Verify `hostIdentity`, `Authorization` header, `sharedSecret` are correct
2. **Encryption errors**: Check `sharedSecret` is `Uint8Array`, not base64 string
3. **404/403 errors**: Verify drive exists, file ACL allows access, user has permission
4. **Type errors**: Import types from source, not re-exported (avoids circular deps)
5. **Query returns empty**: Check `fileType`, `tagsMatchAll`, drive alias/type are correct
6. **WebSocket not connecting**: Verify drives exist, check browser console for WS errors
7. **Content not hydrating**: Use `getContentFromHeaderOrPayload`, check `isEncrypted` flag
8. **Build errors**: Run `npm run build:libs`, check `get_errors` tool output

## Performance tips

1. **Headers-only queries**: Set `includeHeaderContent: false` when you don't need file content
2. **Pagination**: Always use `cursorState` and reasonable `maxRecords` (10-100)
3. **Batch operations**: Limit concurrency (5-10 concurrent requests max)
4. **Caching**: Use localStorage/sessionStorage for tokens, recent queries
5. **WebSocket**: Prefer notifications over polling for real-time updates
6. **Lazy loading**: Fetch thumbnails/payloads only when displayed
7. **Debounce**: Delay search queries until user stops typing (300-500ms)

## Security reminders

- Never log `sharedSecret`, `clientAuthToken`, or decrypted sensitive content
- Always use HTTPS in production (wss:// for WebSockets)
- Validate user input before using in queries (prevent injection)
- Use `SecurityGroupType.Owner` for private content
- Check ACLs before assuming file is accessible
- Invalidate cached tokens on 401/403 errors
- Use `crypto.randomUUID()` or `getRandom16ByteArray()` for IDs/IVs
