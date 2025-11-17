# PEER Module Documentation

## Overview
The PEER module provides peer-to-peer data exchange, allowing retrieval of data from other identities.

**All functions verified from actual source code.**

---

## Drive Operations Over Peer

- `getDrivesByTypeOverPeer(dotYouClient, odinId, type)` - Get drives by type from peer

---

## File Operations Over Peer

### By File ID
- `getFileHeaderOverPeer<T>(dotYouClient, targetDrive, fileId, odinId, options?)` - Get header
- `getFileHeaderBytesOverPeer(dotYouClient, targetDrive, fileId, odinId, options?)` - Get header bytes
- `getPayloadAsJsonOverPeer<T>(dotYouClient, targetDrive, fileId, odinId, key?, options?)` - Get payload JSON
- `getPayloadBytesOverPeer(dotYouClient, targetDrive, fileId, odinId, key?, options?)` - Get payload bytes
- `getThumbBytesOverPeer(dotYouClient, targetDrive, fileId, odinId, options?)` - Get thumbnail
- `getContentFromHeaderOverPeer<T>(dotYouClient, file)` - Get content from header
- `getContentFromHeaderOrPayloadOverPeer<T>(dotYouClient, file, odinId, options?)` - Get from header or payload

### By Unique ID
- `getFileHeaderOverPeerByUniqueId<T>(dotYouClient, targetDrive, uniqueId, odinId, options?)` - Get header by unique ID
- `getFileHeaderBytesOverPeerByUniqueId(dotYouClient, targetDrive, uniqueId, odinId, options?)` - Get header bytes by unique ID

### By Global Transit ID
- `getPayloadAsJsonOverPeerByGlobalTransitId<T>(dotYouClient, odinId, globalTransitId, options?)` - Get payload JSON
- `getPayloadBytesOverPeerByGlobalTransitId(dotYouClient, odinId, globalTransitId, key?, options?)` - Get payload bytes
- `getThumbBytesOverPeerByGlobalTransitId(dotYouClient, odinId, globalTransitId, options?)` - Get thumbnail
- `getFileHeaderOverPeerByGlobalTransitId<T>(dotYouClient, odinId, globalTransitId, options?)` - Get header
- `getFileHeaderBytesOverPeerByGlobalTransitId(dotYouClient, odinId, globalTransitId, options?)` - Get header bytes
- `getContentFromHeaderOrPayloadOverPeerByGlobalTransitId<T>(dotYouClient, odinId, globalTransitId, options?)` - Get from header or payload

### File Management
- `deleteFileOverPeer(dotYouClient, targetDrive, fileId, recipients, options?)` - Delete file over peer

---

## Query Over Peer

- `queryBatchOverPeer<T>(dotYouClient, params, odinId, options?)` - Batch query
- `queryModifiedOverPeer(dotYouClient, params, odinId, options?)` - Query modified

---

## Upload Over Peer

- `uploadFileOverPeer(dotYouClient, instructionSet, metadata, payloads?, options?)` - Upload file to peer

---

## Inbox

- `processInbox(dotYouClient)` - Process inbox

---

## Media Over Peer

### Images
- `getDecryptedThumbnailMetaOverPeer(dotYouClient, targetDrive, fileId, odinId, options?)` - Get thumbnail meta
- `getDecryptedImageUrlOverPeerByGlobalTransitId(...)` - Get image URL by global transit ID
- `getDecryptedImageUrlOverPeer(...)` - Get image URL
- `getDecryptedImageDataOverPeerByGlobalTransitId(...)` - Get image data by global transit ID
- `getDecryptedImageDataOverPeer(...)` - Get image data

### Videos
- `getDecryptedVideoChunkOverPeer(...)` - Get video chunk
- `getDecryptedVideoUrlOverPeer(...)` - Get video URL
- `getDecryptedVideoUrlOverPeerByGlobalTransitId(...)` - Get video URL by global transit ID

### Generic Media
- `getDecryptedMediaUrlOverPeerByGlobalTransitId(...)` - Get media URL by global transit ID
- `getDecryptedMediaUrlOverPeer(...)` - Get media URL

---

## Posts Over Peer

- `getSocialFeed(dotYouClient, options?)` - Get social feed from connections
- `getChannelsOverPeer(dotYouClient, odinId)` - Get channels from peer
- `getChannelOverPeer(dotYouClient, odinId, channelId)` - Get channel from peer
- `getChannelBySlugOverPeer(dotYouClient, odinId, slug)` - Get channel by slug
- `getPostOverPeer(dotYouClient, odinId, channelId, postKey)` - Get post from peer
- `getPostBySlugOverPeer<T>(dotYouClient, odinId, channelId, slug)` - Get post by slug

### Post Types
- `RecentsFromConnectionsReturn` interface

---

## Profile Over Peer

- `getProfileAttributesOverPeer(dotYouClient, odinId, profileId?)` - Get profile attributes
- `dsrToAttributeFileOverPeer(dotYouClient, dsr)` - Convert DSR to attribute file

---

## WebSocket Over Peer

- `SubscribeOverPeer(dotYouClient, odinId, driveId, options?)` - Subscribe to peer notifications
- `UnsubscribeOverPeer(dotYouClient, odinId, id)` - Unsubscribe
- `NotifyOverPeer(command)` - Send notification to peer

---

## Read Receipts

- `sendReadReceipt(dotYouClient, recipients, fileId, targetDrive?)` - Send read receipt

### Read Receipt Types
- `SendReadReceiptResponse` interface
- `SendReadReceiptResponseRecipientStatus` enum

---

## Transit Types

- `TransitQueryBatchRequest` interface
- `TransitInstructionSet` interface
- `TransitUploadResult` interface

---

All exports verified from `packages/libs/js-lib/src/peer/`.
