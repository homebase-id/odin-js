# Public Module Documentation

## Overview

The **Public module** handles public content and publishing operations:

- **Home Page**: Public home page data
- **Posts**: Public post creation, reading, and management
- **Channels**: Post channel management and collaboration
- **Reactions**: Comment and emoji reactions on posts
- **File Publishing**: Publishing files for public access
- **Profile Cards**: Public profile card management

---

## File Structure

```
public/
├── public.ts                             # Module exports
├── home/
│   └── HomeTypes.ts                     # Home page types
├── posts/
│   ├── PostTypes.ts                     # Post data structures
│   ├── PostProvider.ts                  # Post CRUD operations
│   ├── Upload/
│   │   └── PostUploader.ts              # Post upload service
│   ├── Channel/
│   │   ├── PostChannelManager.ts        # Channel management
│   │   └── PostCollaborativeChannelsManager.ts # Collaboration
│   └── Reaction/
│       ├── PostCommentReactionManager.ts # Comment reactions
│       └── PostEmojiReactionManager.ts   # Emoji reactions
└── file/
    ├── FileProvider.ts                   # Public file operations
    ├── FilePublishManager.ts             # Publishing manager
    └── ProfileCardManager.ts             # Profile card manager
```

---

## API Reference

### PostProvider

#### getPost()

```typescript
async getPost(
  dotYouClient: DotYouClient,
  postId: string
): Promise<PostContent | null>;
```

Retrieves a single post by ID.

---

#### getPosts()

```typescript
async getPosts(
  dotYouClient: DotYouClient,
  channelId: string,
  options?: {
    cursor?: string;
    maxResults?: number;
  }
): Promise<PostPage>;
```

Retrieves posts from a channel with pagination.

---

### PostUploader

#### uploadPost()

```typescript
async uploadPost(
  dotYouClient: DotYouClient,
  post: PostContent,
  options?: {
    channelId?: string;
    mediaFiles?: File[];
  }
): Promise<UploadResult>;
```

Uploads a new post with optional media.

**Example**:
```typescript
import { uploadPost } from '@homebase-id/js-lib/public';

const result = await uploadPost(client, {
  caption: 'Hello World!',
  tags: ['greeting'],
  authorOdinId: 'alice.dotyou.cloud'
}, {
  channelId: 'my-blog',
  mediaFiles: [imageFile1, imageFile2]
});
```

---

### PostChannelManager

#### createChannel()

```typescript
async createChannel(
  dotYouClient: DotYouClient,
  channel: ChannelDefinition
): Promise<string>;
```

Creates a new post channel.

---

#### getChannels()

```typescript
async getChannels(
  dotYouClient: DotYouClient
): Promise<ChannelDefinition[]>;
```

Lists all post channels.

---

### PostEmojiReactionManager

#### addReactionToPost()

```typescript
async addReactionToPost(
  dotYouClient: DotYouClient,
  postId: string,
  emoji: string
): Promise<void>;
```

Adds emoji reaction to a post.

---

### FilePublishManager

#### publishFile()

```typescript
async publishFile(
  dotYouClient: DotYouClient,
  fileId: string,
  options?: PublishOptions
): Promise<PublishResult>;
```

Publishes a file for public access.

---

## Common Patterns

### Pattern 1: Create and Publish Post

```typescript
import { uploadPost } from '@homebase-id/js-lib/public';

const post = await uploadPost(client, {
  caption: 'My first post!',
  tags: ['blog', 'introduction'],
  authorOdinId: client.getIdentity()
}, {
  channelId: 'blog',
  mediaFiles: [coverImage]
});

console.log('Published post:', post.file.fileId);
```

---

### Pattern 2: Read Public Posts

```typescript
import { getPosts } from '@homebase-id/js-lib/public';

let cursor: string | undefined;
const allPosts = [];

do {
  const page = await getPosts(client, 'blog', {
    cursor,
    maxResults: 20
  });
  
  allPosts.push(...page.results);
  cursor = page.cursor;
} while (cursor);
```

---

## Related Documentation

- [CORE_MODULE.md](./CORE_MODULE.md) - File and drive operations
- [NETWORK_MODULE.md](./NETWORK_MODULE.md) - Social connections

---

**Last Updated**: October 31, 2025  
**Module Path**: `packages/libs/js-lib/src/public/`
