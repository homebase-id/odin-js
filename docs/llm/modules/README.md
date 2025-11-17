# Module Documentation

This directory contains comprehensive documentation for each major module in the `@homebase-id/js-lib` library.

## Quick Start

For AI assistants and developers working with the Homebase ecosystem:

1. **Start with the main documentation** in `docs/llm/`
2. **Refer to module docs** as needed for specific functionality
3. **Use MODULE_INDEX.md** for quick reference

## Available Modules

### Core Modules

- **[CORE_MODULE.md](./CORE_MODULE.md)** (1,146 lines)

  - DotYouClient, Drive, File, Query, Upload, Security, WebSocket, Reactions
  - The foundation of all operations

- **[AUTH_MODULE.md](./AUTH_MODULE.md)** (848 lines)

  - Authentication flow, ECC/RSA keys, Identity management
  - Essential for secure communication

- **[HELPERS_MODULE.md](./HELPERS_MODULE.md)** (528 lines)
  - Utilities, encryption, data transformations
  - Common functions used throughout

### Domain Modules

- **[PUBLIC_MODULE.md](./PUBLIC_MODULE.md)** (218 lines)

  - Public posts, files, home page, publishing

- **[NETWORK_MODULE.md](./NETWORK_MODULE.md)** (297 lines)

  - Connections, circles, contacts, follows, permissions

- **[PROFILE_MODULE.md](./PROFILE_MODULE.md)** (155 lines)

  - Profile attributes, definitions, validation

- **[PEER_MODULE.md](./PEER_MODULE.md)** (190 lines)

  - Peer-to-peer communication, external data, inbox

- **[MEDIA_MODULE.md](./MEDIA_MODULE.md)** (277 lines)
  - Images, video, thumbnails, link previews

## Documentation Structure

Each module doc contains:

- **Overview**: Purpose and capabilities
- **File Structure**: Complete directory listing
- **Key Components**: Major files and their roles
- **API Reference**: Functions with full signatures
- **Type Definitions**: TypeScript interfaces
- **Usage Examples**: Real-world code samples
- **Common Patterns**: Best practices with code
- **Related Documentation**: Cross-references

## Usage for AI Assistants

When working on a task:

1. **Identify the relevant module** based on the functionality needed
2. **Load the specific module doc** for detailed API information
3. **Reference patterns and examples** for implementation guidance
4. **Cross-reference related modules** as needed

### Example: Implementing File Upload

```
Task: Upload a file with thumbnail
Modules needed:
- CORE_MODULE.md → uploadFile() function
- HELPERS_MODULE.md → generateThumbnails()
- Look for "Pattern: Upload with Thumbnails"
```

### Example: Implementing Authentication

```
Task: Authenticate user
Modules needed:
- AUTH_MODULE.md → Complete auth flow
- CORE_MODULE.md → DotYouClient setup
- Look for "Pattern: Complete Authentication Flow"
```

## Total Coverage

- **Total Lines**: 3,659 lines
- **Total Size**: ~75KB
- **8 Modules**: Complete API coverage
- **100+ Functions**: Documented with examples

## Integration with MCP Server

These docs are served by the MCP docs server at:

- `packages/libs/mcp-docs-server/`

Access via:

- `GET /mcp/docs` - List all docs
- `GET /mcp/docs/modules/CORE_MODULE.md` - Get specific doc

## Maintenance

When updating module documentation:

1. Update the relevant `*_MODULE.md` file
2. Ensure examples are tested
3. Cross-check related modules
4. Update MODULE_INDEX.md if adding new modules

## See Also

- [../AUTHENTICATION.md](../AUTHENTICATION.md) - Complete authentication guide
- [../WORKSPACE_INSTRUCTIONS.md](../WORKSPACE_INSTRUCTIONS.md) - Main developer guide
- [MODULE_INDEX.md](./MODULE_INDEX.md) - Quick reference table
- [MODULES_STATUS.md](./MODULES_STATUS.md) - Project status

---

**Last Updated**: November 17, 2025
**Status**: Production Ready
**Coverage**: Complete
