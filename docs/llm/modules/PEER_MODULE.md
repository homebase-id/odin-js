# Peer Module Documentation

## Overview

The **Peer module** enables cross-identity data operations and peer-to-peer communication:

- **Peer Files**: Access files from other identities
- **Peer Drives**: Drive operations on remote identities
- **Peer Queries**: Query files from connected identities
- **Peer Uploads**: Send files to other identities
- **Inbox**: Receive files and data from peers
- **External Media**: Fetch media from other identities
- **External Posts**: Read posts from connected identities
- **External Profiles**: Access profile data from peers
- **Peer WebSocket**: Real-time updates from peers
- **Read Receipts**: Track file read status

---

## File Structure

```
peer/
├── peer.ts                                  # Module exports
├── peerData/
│   ├── Drive/
│   │   └── PeerDriveProvider.ts            # Remote drive operations
│   ├── File/
│   │   ├── PeerFileProvider.ts             # Peer file operations
│   │   ├── PeerFileByUniqueIdProvider.ts   # File by unique ID
│   │   ├── PeerFileByGlobalTransitProvider.ts # File by transit ID
│   │   ├── PeerFileManager.ts              # File management
│   │   └── PeerReadReceiptManager.ts        # Read receipts
│   ├── Query/
│   │   └── PeerDriveQueryService.ts        # Query peer files
│   ├── Upload/
│   │   └── PeerFileUploader.ts             # Send files to peers
│   ├── Media/
│   │   ├── ExternalMediaProvider.ts        # External media access
│   │   ├── ExternalImageProvider.ts        # External images
│   │   └── ExternalVideoProvider.ts        # External videos
│   ├── InboxProvider.ts                    # Inbox management
│   ├── ExternalPostsDataProvider.ts        # External posts
│   ├── ExternalProfileDataProvider.ts      # External profiles
│   └── PeerTypes.ts                        # Peer type definitions
└── WebsocketData/
    └── WebsocketProviderOverPeer.ts         # Peer WebSocket
```

---

## API Reference

### PeerFileProvider

#### getPeerFile()

```typescript
async getPeerFile(
  dotYouClient: DotYouClient,
  peerIdentity: string,
  fileId: string
): Promise<HomebaseFile | null>;
```

Retrieves a file from another identity.

**Example**:
```typescript
import { getPeerFile } from '@homebase-id/js-lib/peer';

const file = await getPeerFile(client, 'bob.dotyou.cloud', fileId);
```

---

### PeerFileUploader

#### sendFileToPeer()

```typescript
async sendFileToPeer(
  dotYouClient: DotYouClient,
  recipient: string,
  file: File,
  metadata?: PeerFileMetadata
): Promise<UploadResult>;
```

Sends a file to another identity.

**Example**:
```typescript
import { sendFileToPeer } from '@homebase-id/js-lib/peer';

await sendFileToPeer(
  client,
  'bob.dotyou.cloud',
  documentFile,
  { description: 'Shared document', tags: ['work'] }
);
```

---

### InboxProvider

#### getInbox()

```typescript
async getInbox(
  dotYouClient: DotYouClient,
  options?: {
    cursor?: string;
    maxResults?: number;
  }
): Promise<InboxPage>;
```

Retrieves inbox items (received files from peers).

---

### ExternalPostsDataProvider

#### getPeerPosts()

```typescript
async getPeerPosts(
  dotYouClient: DotYouClient,
  peerIdentity: string,
  channelId: string
): Promise<PostContent[]>;
```

Retrieves posts from a connected identity.

---

## Common Patterns

### Pattern 1: Send File to Peer

```typescript
import { sendFileToPeer } from '@homebase-id/js-lib/peer';

await sendFileToPeer(
  client,
  'alice.dotyou.cloud',
  photoFile,
  { description: 'Vacation photos' }
);
```

---

### Pattern 2: Check Inbox

```typescript
import { getInbox } from '@homebase-id/js-lib/peer';

const inbox = await getInbox(client, { maxResults: 20 });
console.log(`${inbox.results.length} new items`);
```

---

### Pattern 3: Query Peer Files

```typescript
import { queryPeerFiles } from '@homebase-id/js-lib/peer';

const peerFiles = await queryPeerFiles(
  client,
  'bob.dotyou.cloud',
  { targetDrive: sharedDrive, maxRecords: 50 }
);
```

---

## Related Documentation

- [CORE_MODULE.md](./CORE_MODULE.md) - File operations
- [NETWORK_MODULE.md](./NETWORK_MODULE.md) - Connections

---

**Last Updated**: October 31, 2025  
**Module Path**: `packages/libs/js-lib/src/peer/`
