# Module Documentation Index

Detailed documentation for each major module in `packages/libs/js-lib/src/`.

## Available Module Docs

### Core Modules

- 📦 [CORE_MODULE.md](./CORE_MODULE.md) - DotYouClient, Drive, File, Query, Upload, Security, WebSocket
- 🔐 [AUTH_MODULE.md](./AUTH_MODULE.md) - Authentication, ECC/RSA keys, Identity management
- 🛠️ [HELPERS_MODULE.md](./HELPERS_MODULE.md) - Utility functions, encryption, data transformations

### Domain Modules

- 🌐 [PUBLIC_MODULE.md](./PUBLIC_MODULE.md) - Public posts, files, home page
- 👥 [NETWORK_MODULE.md](./NETWORK_MODULE.md) - Connections, circles, contacts, follows
- 👤 [PROFILE_MODULE.md](./PROFILE_MODULE.md) - Profile attributes and definitions
- 🔗 [PEER_MODULE.md](./PEER_MODULE.md) - Peer-to-peer communication, external data
- 🎬 [MEDIA_MODULE.md](./MEDIA_MODULE.md) - Images, video, thumbnails, link previews

## How to Use

Each module doc contains:

- **Overview**: Purpose and capabilities
- **Function Discovery**: What functions are available and when to use them
- **Conceptual Guidance**: Understanding what each function does
- **Usage Patterns**: When and how to use functions

## For MCP Servers and AI Assistants

**Important**: These module docs are for conceptual understanding and function discovery. For complete TypeScript signatures, parameter types, return types, and interface definitions, read directly from:

```
packages/libs/js-lib/src/**/*.ts        # Source TypeScript files
packages/libs/js-lib/dist/**/*.d.ts     # Generated declaration files
node_modules/@homebase-id/js-lib/**/*.d.ts  # Installed package types
```

**Why?** TypeScript declaration files (`.d.ts`) contain:

- Complete function signatures with all parameters and types
- Full interface and type definitions
- Generic type parameters
- JSDoc comments with detailed descriptions
- Always up-to-date with actual implementation

**Recommended MCP Server Approach**:

1. Read module docs for function discovery ("what functions exist?")
2. Parse `.d.ts` files for complete type information ("what are the exact signatures?")
3. Generate type-safe code using actual TypeScript definitions

This approach ensures:

- ✅ Always accurate type information
- ✅ No duplication of type definitions
- ✅ Automatic updates when library changes
- ✅ Smaller, more focused documentation
- ✅ Direct access to JSDoc comments from source code

## Quick Reference

| Module  | Primary Use Cases                        |
| ------- | ---------------------------------------- |
| Core    | File storage, queries, real-time updates |
| Auth    | Login, token management, key exchange    |
| Helpers | Encryption, data utils, permissions      |
| Public  | Publishing content, reading public posts |
| Network | Social graph, connections, messaging     |
| Profile | User profile data and attributes         |
| Peer    | Cross-identity communication             |
| Media   | Image/video processing, thumbnails       |
