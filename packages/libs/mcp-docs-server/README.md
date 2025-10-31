# MCP Docs Server (Network-Based)

Zero-install MCP documentation server that fetches docs from GitHub raw URLs. No local filesystem dependencies—works from anywhere with network access.

## Features

- Fetches documentation directly from GitHub repository
- Zero-config: no local file dependencies
- Dependency-free: uses only Node.js built-in modules
- CORS-enabled for browser-based MCP clients
- Simple HTTP endpoints compatible with MCP patterns

## Usage

**Prerequisites:** The `docs/llm/` directory must be pushed to GitHub for the server to fetch files. If you're testing on a branch that hasn't been pushed yet, either:

1. Push your branch to GitHub first, or
2. Set `GITHUB_BRANCH=main` (or another branch where docs exist), or
3. For local testing, use a local filesystem server instead (see Option 1 in docs/llm/README.md)

4. Start the server:

```bash
cd packages/libs/mcp-docs-server
node src/index.js
```

Or with npm:

```bash
npm start
```

2. Server runs on `http://localhost:4000` (configure with `PORT` env var)

## Configuration

Set environment variables to customize:

```bash
# Change port (default: 4000)
PORT=8080 npm start

# Point to different repo/branch (defaults to homebase-id/odin-js mcp-llm-doc-creation branch)
GITHUB_OWNER=your-org GITHUB_REPO=your-repo GITHUB_BRANCH=main npm start
```

## Endpoints

### List available docs

```bash
GET /mcp/docs
```

Returns JSON array of available documentation files:

```json
{
  "docs": [
    {
      "name": "WORKSPACE_INSTRUCTIONS.md",
      "path": "/mcp/docs/WORKSPACE_INSTRUCTIONS.md",
      "url": "https://raw.githubusercontent.com/..."
    }
  ]
}
```

### Get document content

```bash
GET /mcp/docs/:filename
```

Returns the raw markdown content. Example:

```bash
curl http://localhost:4000/mcp/docs/WORKSPACE_INSTRUCTIONS.md
```

### Get MCP manifest

```bash
GET /mcp/manifest
```

Returns metadata about the docs provider:

```json
{
  "id": "mcp-docs-server-network",
  "title": "Odin.js Documentation (Network)",
  "description": "Documentation fetched from GitHub",
  "source": "https://github.com/homebase-id/odin-js",
  "docsEndpoint": "/mcp/docs"
}
```

## Example Usage

```bash
# List all docs
curl http://localhost:4000/mcp/docs | jq .

# Fetch a specific doc
curl http://localhost:4000/mcp/docs/ARCHITECTURE.md

# Get manifest
curl http://localhost:4000/mcp/manifest | jq .
```

## Architecture

This server:

1. Maintains a list of known docs files (WORKSPACE_INSTRUCTIONS.md, ARCHITECTURE.md, etc.)
2. Fetches content on-demand from GitHub raw URLs
3. Caches responses in memory (5 minute TTL) to reduce GitHub requests
4. Returns 404 for unknown files

## Notes

- No local filesystem access required
- Uses Node.js `https` module for fetching
- Implements simple in-memory caching
- CORS enabled for cross-origin requests
- Works with any public GitHub repository
