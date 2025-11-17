# PUBLIC Module Documentation

## Overview
The PUBLIC module provides functions for managing public content like posts, channels, files, and publishing to the public web.

**All functions verified from actual source code.**

---

## Post Management

### Post Provider Functions
- `getPosts(dotYouClient, channelId, options)` - Get posts from channel
- `getRecentPosts(dotYouClient, channelId, count?)` - Get recent posts
- `getPostByFileId(dotYouClient, channelId, fileId)` - Get post by file ID
- `getPostByGlobalTransitId(dotYouClient, globalTransitId)` - Get post by global transit ID
- `getPost(dotYouClient, channelId, postKey)` - Generic post getter
- `getPostBySlug(dotYouClient, channelId, slug)` - Get post by slug
- `removePost(dotYouClient, channelId, postKey)` - Delete post
- `dsrToPostFile(dsr)` - Convert DSR to PostFile
- `getPostFileFromHeaderOrPayload(dotYouClient, dsr)` - Get post from header or payload

### Post Types
- `BlogConfig` class - Blog configuration
- `ReactionConfig` class - Reaction configuration  
- `postTypeToDataType(type)` - Convert post type to data type number

---

## Channel Management

All exports from:
- `posts/Channel/PostChannelManager.ts`
- `posts/Channel/PostCollaborativeChannelsManager.ts`

---

## Post Upload

All exports from `posts/Upload/PostUploader.ts`

---

## Reactions

All exports from:
- `posts/Reaction/PostCommentReactionManager.ts`
- `posts/Reaction/PostEmojiReactionManager.ts`

---

## File Management

All exports from:
- `file/FileProvider.ts`
- `file/FilePublishManager.ts`
- `file/ProfileCardManager.ts`

---

## Home Types

All exports from `home/HomeTypes.ts`

---

All exports verified from `packages/libs/js-lib/src/public/`.
