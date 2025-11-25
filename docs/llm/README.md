# LLM Documentation

Comprehensive documentation designed for AI assistants (LLMs) to understand and work with the `odin-js` library autonomously.

## Documentation Structure

### 📋 [WORKSPACE_INSTRUCTIONS.md](./WORKSPACE_INSTRUCTIONS.md)

**Start here first!** Primary guide for LLMs working in this codebase. Covers architecture overview, implementation guidelines, common patterns, and best practices.

### 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md)

System architecture, component overview, data flows, security model, WebSocket lifecycle, and encryption patterns.

### 🔐 [AUTHENTICATION.md](./AUTHENTICATION.md)

**Complete authentication guide** covering YouAuth protocol, ECC key exchange, ECDH/HKDF key derivation, token management, implementation patterns, and security considerations. Essential for implementing auth flows.

### 🗺️ [CODE_MAP.md](./CODE_MAP.md)

Module-by-module mapping of the codebase. Maps features to files and functions. Quick reference for locating specific functionality.

### 📚 [GLOSSARY.md](./GLOSSARY.md)

Comprehensive terminology reference. Definitions for Drive, File, Identity, TargetDrive, FileId, and all core concepts.

### 🔧 [RUNBOOK.md](./RUNBOOK.md)

Operational guide for common tasks: setup, testing, debugging, deployment, and troubleshooting patterns.

### 📦 [modules/](./modules/)

**Module documentation** - Conceptual overview and function discovery for each module. For complete TypeScript signatures and type definitions, MCP servers should read directly from:

- **Source files**: `packages/libs/js-lib/src/**/*.ts` - Original TypeScript with full type information
- **Declaration files**: `packages/libs/js-lib/dist/**/*.d.ts` - Generated type definitions (after build)
- **Installed package**: `node_modules/@homebase-id/js-lib/**/*.d.ts` - Published package types

Module docs provide:

- [modules/MODULE_INDEX.md](./modules/MODULE_INDEX.md) - Navigation guide and overview
- Core, Auth, Helpers, Public, Network, Profile, Peer, Media modules - Function discovery, usage patterns, when to use what

**Note for MCP servers**: Parse `.d.ts` files for complete type signatures rather than relying on markdown docs. The module docs are for conceptual understanding and function discovery.

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
  EOF\* Main entry point with quick facts, golden rules, common patterns, and implementation examples.

**Use when**:

- Getting oriented in the codebase
- Looking for quick reference patterns
- Need examples of common operations
- Want to understand best practices

**Contents**:

- Quick facts and setup
- Golden rules (what to avoid)
- Where things live (file locations)
- Common tasks (how to query, upload, delete)
- Implementation guidelines
- Code patterns with examples
- Quick reference imports
- Debugging checklist
- Performance tips
- Security reminders

### 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md)

Deep dive into system design, component interactions, and data flows.

**Use when**:

- Understanding how the library works internally
- Learning about encryption/decryption flow
- Need to know request lifecycle
- Want to understand domain separation
- Planning major changes or new features

**Contents**:

- System overview
- Core components (DotYouClient, Drive, File, Query, Upload, Security, WebSocket)
- Domain architecture (Public, Network, Profile, Media, Auth)
- Data flow patterns
- Pagination strategy
- Error handling strategy
- Performance considerations
- Testing strategy
- Deployment patterns
- Security model
- Extension points

### 🗺️ [CODE_MAP.md](./CODE_MAP.md)

Detailed file and module locations with function listings.

**Use when**:

- Looking for specific files or functions
- Need to know where to add new code
- Want to understand module organization
- Searching for type definitions
- Need import path examples

**Contents**:

- Entry points (index.ts, core.ts)
- Core module breakdown (Drive, File, Query, Upload, Security, Encryption, WebSocket, Reactions)
- Public module (Posts, Files)
- Network module (Connections, Circles, Contacts, Follows)
- Profile module (Attributes, Definitions)
- Peer module (Peer WebSocket)
- Auth module (Authentication, Keys)
- Media module (Thumbnails, Image, Link, Video)
- Helpers module
- Type organization
- Import paths
- Testing files

### 📖 [RUNBOOK.md](./RUNBOOK.md)

Operational procedures for development, debugging, and deployment.

**Use when**:

- Setting up development environment
- Running applications or tests
- Making changes to the library
- Debugging issues
- Deploying or publishing
- Performing maintenance tasks

**Contents**:

- Development setup (prerequisites, initial setup)
- Running applications (VS Code tasks, command line)
- Making changes workflow
- Authentication setup
- Common operations (query, upload, delete, subscribe)
- Debugging guide (enable logging, common issues, DevTools)
- Deployment (building, publishing, environment configs)
- Performance monitoring
- Troubleshooting checklist
- Getting help
- Maintenance tasks
- CI/CD
- Version control

### 📚 [GLOSSARY.md](./GLOSSARY.md)

Comprehensive terminology reference with definitions and examples.

**Use when**:

- Encountering unfamiliar terms
- Need precise definitions
- Want to understand domain vocabulary
- Looking for naming conventions
- Need to know anti-patterns

**Contents**:

- Core concepts (Identity, Drive, File, HomebaseFile)
- File metadata (uniqueId, fileType, dataType, tags, groupId)
- Query terms (queryBatch, cursorState, maxRecords, filters)
- Upload terms (UploadInstructionSet, transferIv, overwriteFileId)
- Security & encryption (sharedSecret, ApiType, SecurityGroupType)
- WebSocket terms (Subscribe, notifications, ping/pong)
- Domain-specific terms (Post, Comment, Reaction, Channel, GTID)
- Network terms (Connection, Circle, Follower)
- Authentication terms (tokens, ECC, peerToken)
- Provider terms
- Technical terms (Axios, Interceptor, IV, Base64)
- Monorepo terms
- HTTP API terms
- Development terms
- Acronyms and abbreviations
- Conventions
- Anti-patterns to avoid
- Version information

## How to Use This Documentation

### For AI Assistants

1. **Always start with WORKSPACE_INSTRUCTIONS.md** - It provides the essential context and patterns
2. **Reference GLOSSARY.md** for terminology you don't recognize
3. **Use CODE_MAP.md** to locate specific files and functions
4. **Consult ARCHITECTURE.md** for understanding system design
5. **Follow RUNBOOK.md** for operational tasks

### For Humans

These docs are optimized for AI consumption but are also useful for:

- Onboarding new developers
- Quick reference during development
- Understanding library architecture
- Troubleshooting issues
- Contributing to the project

## Exposing Documentation to Other LLMs

There are several ways to make this documentation discoverable and usable by other LLMs:

### 1. Package.json Metadata (Recommended)

Add to `packages/libs/js-lib/package.json`:

```json
{
  "name": "@homebase-id/js-lib",
  "version": "1.0.0",
  "description": "TypeScript SDK for DotYou/Odin platform",
  "llm": {
    "documentation": "https://raw.githubusercontent.com/homebase-id/odin-js/main/docs/llm/WORKSPACE_INSTRUCTIONS.md",
    "architecture": "https://raw.githubusercontent.com/homebase-id/odin-js/main/docs/llm/ARCHITECTURE.md",
    "codeMap": "https://raw.githubusercontent.com/homebase-id/odin-js/main/docs/llm/CODE_MAP.md",
    "runbook": "https://raw.githubusercontent.com/homebase-id/odin-js/main/docs/llm/RUNBOOK.md",
    "glossary": "https://raw.githubusercontent.com/homebase-id/odin-js/main/docs/llm/GLOSSARY.md"
  },
  "ai-instructions": "https://raw.githubusercontent.com/homebase-id/odin-js/main/docs/llm/README.md"
}
```

### 2. Repository README Badge

Add to main `README.md`:

```markdown
[![LLM Documentation](https://img.shields.io/badge/LLM-Documentation-blue)](./docs/llm/README.md)

## AI Assistant Support

This library includes comprehensive documentation for AI assistants:

- 📋 [Workspace Instructions](./docs/llm/WORKSPACE_INSTRUCTIONS.md) - Quick start and patterns
- ��️ [Architecture](./docs/llm/ARCHITECTURE.md) - System design
- 🗺️ [Code Map](./docs/llm/CODE_MAP.md) - File locations
- 📖 [Runbook](./docs/llm/RUNBOOK.md) - Operations guide
- 📚 [Glossary](./docs/llm/GLOSSARY.md) - Terminology reference
```

### 3. .ai-context File (Root Directory)

Create `.ai-context` in repository root:

```yaml
name: odin-js
description: TypeScript SDK for DotYou/Odin distributed personal data platform
repository: https://github.com/homebase-id/odin-js
documentation:
  llm:
    workspace: docs/llm/WORKSPACE_INSTRUCTIONS.md
    architecture: docs/llm/ARCHITECTURE.md
    codeMap: docs/llm/CODE_MAP.md
    runbook: docs/llm/RUNBOOK.md
    glossary: docs/llm/GLOSSARY.md
  api: docs/api/v2/
main-library: packages/libs/js-lib
entry-point: packages/libs/js-lib/src/index.ts
```

### 4. npm Package README

In npm package README (`packages/libs/js-lib/README.md`), add:

```markdown
## For AI Assistants

This library includes comprehensive documentation designed for AI coding assistants:

- **[Workspace Instructions](../../docs/llm/WORKSPACE_INSTRUCTIONS.md)** - Start here for patterns and examples
- **[Architecture Guide](../../docs/llm/ARCHITECTURE.md)** - Understand the system design
- **[Code Map](../../docs/llm/CODE_MAP.md)** - Find files and functions
- **[Operations Runbook](../../docs/llm/RUNBOOK.md)** - Development and debugging
- **[Glossary](../../docs/llm/GLOSSARY.md)** - Terminology reference

These docs enable autonomous implementation of features following established patterns.
```

### 5. GitHub Copilot Instructions

Users can reference in their project's `.github/copilot-instructions.md`:

```markdown
# Copilot Instructions for odin-js

When working with `@homebase-id/js-lib`, refer to the comprehensive LLM documentation:

https://raw.githubusercontent.com/homebase-id/odin-js/main/docs/llm/WORKSPACE_INSTRUCTIONS.md

Key points:

- Always use DotYouClient for API calls
- Follow encryption patterns (don't bypass interceptors)
- Respect pagination with cursorState
- Use existing providers before creating new ones
- Check GLOSSARY.md for terminology
```

### 6. VS Code Custom Instructions File

Users can create `.github/copilot-instructions.md` in their project root:

```markdown
When working with `@homebase-id/js-lib`, refer to the comprehensive LLM documentation:

https://raw.githubusercontent.com/homebase-id/odin-js/main/docs/llm/WORKSPACE_INSTRUCTIONS.md

Key points:

- Always use DotYouClient for API calls
- Follow encryption patterns (don't bypass interceptors)
- Respect pagination with cursorState
- Use existing providers before creating new ones
- Check GLOSSARY.md for terminology
```

This file is automatically used by GitHub Copilot in VS Code.

### 7. Cursor AI (.cursorrules)

Add `.cursorrules` file to projects using the library:

```
This project uses @homebase-id/js-lib. Reference the LLM documentation at:
docs/llm/WORKSPACE_INSTRUCTIONS.md

Follow the golden rules and established patterns documented there.
Key principles:
- Always use DotYouClient for API calls
- Let interceptors handle encryption automatically
- Respect pagination with cursorState
- Use getContentFromHeaderOrPayload for content hydration
```

### 8. MCP (Model Context Protocol) Server

Create an MCP server that exposes these docs as resources:

```typescript
// mcp-server/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'fs/promises';

const server = new Server(
  {
    name: 'odin-js-docs',
    version: '1.0.0',
  },
  {
    capabilities: { resources: {} },
  }
);

server.setRequestHandler('resources/list', async () => ({
  resources: [
    { uri: 'odin://docs/workspace', name: 'Workspace Instructions', mimeType: 'text/markdown' },
    { uri: 'odin://docs/architecture', name: 'Architecture', mimeType: 'text/markdown' },
    { uri: 'odin://docs/code-map', name: 'Code Map', mimeType: 'text/markdown' },
    { uri: 'odin://docs/runbook', name: 'Runbook', mimeType: 'text/markdown' },
    { uri: 'odin://docs/glossary', name: 'Glossary', mimeType: 'text/markdown' },
  ],
}));

server.setRequestHandler('resources/read', async (request) => {
  const uri = request.params.uri;
  const fileMap = {
    'odin://docs/workspace': 'WORKSPACE_INSTRUCTIONS.md',
    'odin://docs/architecture': 'ARCHITECTURE.md',
    'odin://docs/code-map': 'CODE_MAP.md',
    'odin://docs/runbook': 'RUNBOOK.md',
    'odin://docs/glossary': 'GLOSSARY.md',
  };

  const filename = fileMap[uri];
  if (!filename) throw new Error('Unknown resource');

  const content = await fs.readFile(`docs/llm/${filename}`, 'utf-8');
  return { contents: [{ uri, mimeType: 'text/markdown', text: content }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Integration Examples

### Claude Projects / Artifacts

Add to project knowledge:

```
Repository: homebase-id/odin-js
Documentation: https://github.com/homebase-id/odin-js/tree/main/docs/llm

Start with WORKSPACE_INSTRUCTIONS.md for patterns and best practices.
```

### Aider

Use `--read` flag to include docs:

```bash
aider --read docs/llm/WORKSPACE_INSTRUCTIONS.md
```

### Continue.dev

Add to `.continuerc.json`:

```json
{
  "contextProviders": [
    {
      "name": "url",
      "params": {
        "urls": [
          "https://raw.githubusercontent.com/homebase-id/odin-js/main/docs/llm/WORKSPACE_INSTRUCTIONS.md"
        ]
      }
    }
  ]
}
```

## Quick Start for LLMs

If you're an AI assistant working with this codebase for the first time:

1. **Read** `WORKSPACE_INSTRUCTIONS.md` first - it has everything you need to start
2. **Check** `GLOSSARY.md` if you encounter unfamiliar terms
3. **Use** `CODE_MAP.md` to find where specific code lives
4. **Follow** the patterns in WORKSPACE_INSTRUCTIONS - don't reinvent
5. **Test** your changes with `npm run build:libs`

## Maintenance

Update these docs when:

- ✅ New major features are added
- ✅ API patterns change
- ✅ New providers are created
- ✅ Architecture evolves
- ✅ Common pitfalls are discovered
- ✅ Debugging procedures change

## Contributing

When adding new features:

1. Add examples to WORKSPACE_INSTRUCTIONS.md
2. Update CODE_MAP.md with new files
3. Add terminology to GLOSSARY.md if needed
4. Update ARCHITECTURE.md if design changes
5. Add debugging tips to RUNBOOK.md if applicable

## File Summary

| File                      | Size  | Purpose                                 |
| ------------------------- | ----- | --------------------------------------- |
| WORKSPACE_INSTRUCTIONS.md | ~15KB | Quick start, patterns, examples         |
| ARCHITECTURE.md           | ~25KB | System design, components, flows        |
| CODE_MAP.md               | ~18KB | File locations, module breakdown        |
| RUNBOOK.md                | ~20KB | Operations, debugging, deployment       |
| GLOSSARY.md               | ~22KB | Terminology, conventions, anti-patterns |

Total: ~100KB of AI-optimized documentation

## License

Same as the main project (see LICENSE in repository root).
