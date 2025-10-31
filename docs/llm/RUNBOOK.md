# Runbook

Operational guide for developing with and deploying the `odin-js` library.

## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- VS Code (recommended)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/homebase-id/odin-js.git
cd odin-js

# Install dependencies
npm install

# Build the library
npm run build:libs
```

### Workspace Structure

```
odin-js/
├── packages/
│   ├── libs/
│   │   └── js-lib/          # Core library (this is what you're working with)
│   ├── apps/
│   │   ├── owner-app/       # Owner dashboard
│   │   ├── feed-app/        # Social feed
│   │   ├── chat-app/        # Messaging
│   │   ├── mail-app/        # Email client
│   │   ├── community-app/   # Community features
│   │   └── ...
│   └── common/
│       ├── common-app/      # Shared app utilities
│       └── rich-text-editor/
├── docs/
│   ├── llm/                 # LLM documentation (this file!)
│   └── api/v2/              # HTTP API reference
└── package.json             # Root package with workspace config
```

## Running Applications

### Start Development Servers

**Option 1: VS Code Tasks** (Recommended)
1. Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
2. Select "Tasks: Run Task"
3. Choose "Run odin-js" for frontend
4. Optionally choose "Run odin-core" for local backend

**Option 2: Command Line**

```bash
# Frontend apps (from repo root)
npm start

# This runs Vite dev server for all apps
# Access apps at:
# - http://localhost:5173 (owner-app)
# - http://localhost:5174 (feed-app)
# etc.
```

### Build Library After Changes

```bash
# From repo root
npm run build:libs

# This compiles packages/libs/js-lib to dist/
# Apps will pick up changes automatically
```

### Run Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- DriveFileProvider.test.ts

# Run tests in watch mode
npm run test:watch
```

## Making Changes to js-lib

### Workflow

1. **Make your changes** in `packages/libs/js-lib/src/`
2. **Build the library**: `npm run build:libs`
3. **Check for errors**: VS Code will show TypeScript errors
4. **Test in an app**: Run an app and verify behavior
5. **Commit**: Stage and commit your changes

### Example: Adding a New Provider

```bash
# 1. Create provider file
touch packages/libs/js-lib/src/public/myfeature/MyFeatureProvider.ts

# 2. Create types file
touch packages/libs/js-lib/src/public/myfeature/MyFeatureTypes.ts

# 3. Edit files (implement provider)
# ... (use your editor)

# 4. Export from domain index
# Edit packages/libs/js-lib/src/public/public.ts
# Add: export * from './myfeature/MyFeatureProvider';

# 5. Build
npm run build:libs

# 6. Test in app
npm start
# Navigate to app and test your new provider
```

### Type Checking

```bash
# Check types without building
npm run typecheck

# Or use VS Code's built-in checking
# Look for red squiggles and Problems panel
```

## Authentication Setup

### For Development

You need credentials to test owner/app operations:

**Option 1: Use Existing Test Account**
```typescript
// In your test app
const client = new DotYouClient({
  api: ApiType.Owner,
  hostIdentity: 'testuser.dotyou.cloud',
  sharedSecret: base64ToUint8Array('YOUR_SHARED_SECRET_BASE64'),
  headers: {
    Authorization: 'Bearer YOUR_CLIENT_TOKEN'
  }
});
```

**Option 2: Create New Test Identity**
1. Visit https://dotyou.cloud (or your instance)
2. Register a new identity
3. Generate app credentials via owner dashboard
4. Use credentials in your app

### Environment Variables

Create `.env` in your app directory:

```env
VITE_IDENTITY=yourname.dotyou.cloud
VITE_CLIENT_TOKEN=your_token_here
VITE_SHARED_SECRET=your_shared_secret_base64_here
```

Then in your app:

```typescript
const client = new DotYouClient({
  api: ApiType.Owner,
  hostIdentity: import.meta.env.VITE_IDENTITY,
  sharedSecret: base64ToUint8Array(import.meta.env.VITE_SHARED_SECRET),
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_TOKEN}`
  }
});
```

**Security**: Never commit `.env` files! Add to `.gitignore`.

## Common Operations

### Query Files

```typescript
import { queryBatch } from '@dotyou/js-lib';

const { results, cursorState } = await queryBatch(dotYouClient, {
  targetDrive: { type: 'your-drive-type', alias: 'your-drive-alias' },
  fileType: [MY_FILE_TYPE],
  maxRecords: 50
});

console.log(`Found ${results.length} files`);
```

### Upload a File

```typescript
import { uploadFile, getRandom16ByteArray } from '@dotyou/js-lib';

const metadata = {
  versionTag: '1.0',
  appData: {
    uniqueId: crypto.randomUUID(),
    userDate: Date.now(),
    content: { title: 'My File', data: '...' }
  },
  isEncrypted: true,
  accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner }
};

const instructionSet = {
  transferIv: getRandom16ByteArray(),
  storageOptions: {
    drive: targetDrive
  }
};

const result = await uploadFile(dotYouClient, instructionSet, metadata);
console.log(`Uploaded file: ${result.file.fileId}`);
```

### Delete a File

```typescript
import { deleteFile } from '@dotyou/js-lib';

await deleteFile(dotYouClient, targetDrive, fileId);
console.log(`Deleted file: ${fileId}`);
```

### Subscribe to Notifications

```typescript
import { Subscribe } from '@dotyou/js-lib';

const handler = async (client, notification) => {
  if (notification.notificationType === 'fileAdded') {
    console.log('New file:', notification.header.fileId);
  }
};

await Subscribe(
  dotYouClient,
  [targetDrive],
  handler,
  () => console.log('Disconnected'),
  () => console.log('Reconnected'),
  undefined,
  'my-subscription'
);
```

## Debugging

### Enable Debug Logging

Add `?debug=true` to your URL:
```
http://localhost:5173\?debug\=true
```

This enables verbose console logging in:
- WebSocket connections
- Query operations
- Upload operations

### Common Issues

#### 1. "SharedSecret required" Error

**Cause**: Trying to use encryption without providing `sharedSecret`.

**Fix**:
```typescript
const client = new DotYouClient({
  api: ApiType.Owner,
  hostIdentity: 'your.identity',
  sharedSecret: base64ToUint8Array('YOUR_SECRET'), // Add this!
  headers: { Authorization: 'Bearer YOUR_TOKEN' }
});
```

#### 2. 401/403 Errors

**Cause**: Invalid or expired auth token, or insufficient permissions.

**Fix**:
- Verify `Authorization` header is correct
- Check token hasn't expired
- Ensure API type (Owner/App/Guest) matches your permissions
- For owner operations, must use `ApiType.Owner`

#### 3. Query Returns Empty

**Cause**: Wrong drive, wrong filters, or files don't exist.

**Fix**:
- Verify `targetDrive` type and alias are correct
- Check `fileType`/`dataType` filters match your files
- Try querying without filters first
- Check `archivalStatus` (0 = not deleted)

#### 4. WebSocket Won't Connect

**Cause**: Invalid drives, network issues, or auth problems.

**Fix**:
- Check drives exist and you have access
- Open browser DevTools → Network → WS tab
- Look for WebSocket connection attempts
- Verify handshake succeeds (look for "deviceHandshakeSuccess")

#### 5. Build Errors After Changes

**Cause**: TypeScript errors or circular dependencies.

**Fix**:
```bash
# Clean build artifacts
rm -rf packages/libs/js-lib/dist

# Rebuild
npm run build:libs

# Check for errors
npm run typecheck
```

### Browser DevTools

**Network Tab**:
- Filter by `api/` to see API requests
- Check request/response headers for encryption IVs
- Verify 200 responses

**Console Tab**:
- Enable debug mode for verbose logs
- Check for error messages
- Look for "DOTYOU" or provider-specific prefixes

**Application Tab**:
- Check localStorage for cached tokens (`odin_peer_token_*`)
- Clear localStorage to reset caches

## Deployment

### Building for Production

```bash
# Build all apps
npm run build

# Build specific app
cd packages/apps/owner-app
npm run build

# Output in dist/ directories
```

### Publishing Library (Maintainers Only)

```bash
# 1. Version bump
cd packages/libs/js-lib
npm version patch  # or minor, major

# 2. Build
npm run build

# 3. Publish to npm
npm publish

# 4. Tag release
git tag -a v1.2.3 -m "Release 1.2.3"
git push origin v1.2.3
```

### Environment-Specific Configs

**Development**:
- Uses `.env` for secrets
- CORS enabled
- Debug logging available

**Staging**:
- Uses staging identities (e.g., `*.staging.dotyou.cloud`)
- Production build with source maps
- Limited debug logging

**Production**:
- Uses production identities (e.g., `*.dotyou.cloud`)
- Minified builds, no source maps
- No debug logging
- Strict CORS

## Performance Monitoring

### Key Metrics

1. **Query Performance**:
   - Typical query: < 500ms
   - Large results (100+ files): < 2s
   - Use browser Performance tab to measure

2. **Upload Performance**:
   - Small files (< 1MB): < 1s
   - Large files (> 10MB): Varies by network
   - Use progress callbacks for feedback

3. **WebSocket Latency**:
   - Notification received: < 500ms after event
   - Ping/pong: < 200ms
   - Check Network WS tab for timing

### Optimization Tips

**Queries**:
```typescript
// ❌ Slow: Fetching payload for all files
queryBatch(client, {
  targetDrive,
  includeHeaderContent: true,
  maxRecords: 100
});

// ✅ Fast: Headers only, fetch payloads on demand
const { results } = await queryBatch(client, {
  targetDrive,
  includeHeaderContent: false,
  maxRecords: 100
});

// Later, fetch specific file payload
const content = await getContentFromHeaderOrPayload(
  client,
  targetDrive,
  results[0]
);
```

**Uploads**:
```typescript
// ❌ Slow: Uploading one at a time
for (const file of files) {
  await uploadFile(...);
}

// ✅ Fast: Parallel uploads (with concurrency limit)
import pLimit from 'p-limit';
const limit = pLimit(5);

await Promise.all(
  files.map(file => limit(() => uploadFile(...)))
);
```

**Caching**:
```typescript
// Cache drive definitions (rarely change)
const driveCache = new Map();

const getDrive = async (type, alias) => {
  const key = `${type}:${alias}`;
  if (driveCache.has(key)) return driveCache.get(key);
  
  const drive = await getDriveDefinition(client, { type, alias });
  driveCache.set(key, drive);
  return drive;
};
```

## Troubleshooting Checklist

When something isn't working:

- [ ] Ran `npm run build:libs` after making changes?
- [ ] Checked TypeScript errors in VS Code Problems panel?
- [ ] Verified credentials (identity, token, shared secret)?
- [ ] Checked browser console for errors?
- [ ] Tried with `?debug=true` for verbose logging?
- [ ] Checked Network tab for failed requests?
- [ ] Verified drive exists and has correct permissions?
- [ ] Tried clearing localStorage and refreshing?
- [ ] Checked this is the right API type (Owner vs App vs Guest)?
- [ ] Read the error message carefully?

## Getting Help

1. **Check Documentation**:
   - `docs/llm/WORKSPACE_INSTRUCTIONS.md` - Overview
   - `docs/llm/ARCHITECTURE.md` - System design
   - `docs/llm/CODE_MAP.md` - File locations
   - `docs/api/v2/` - HTTP API reference

2. **Search Codebase**:
   ```bash
   # Find similar implementations
   grep -r "queryBatch" packages/libs/js-lib/src/
   
   # Find type definitions
   grep -r "interface.*Content" packages/libs/js-lib/src/
   ```

3. **Ask for Help**:
   - GitHub Issues: Report bugs or request features
   - Team Chat: Ask maintainers for guidance

## Maintenance Tasks

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update specific package
npm update axios

# Update all packages (careful!)
npm update

# Rebuild after updates
npm run build:libs
npm run build
```

### Cleaning Build Artifacts

```bash
# Clean js-lib dist
rm -rf packages/libs/js-lib/dist

# Clean all node_modules (nuclear option)
rm -rf node_modules packages/*/node_modules packages/*/*/node_modules
npm install
```

### Database/Cache Cleanup

```bash
# Clear localStorage (in browser console)
localStorage.clear();

# Or selectively:
Object.keys(localStorage)
  .filter(k => k.startsWith('odin_peer_token_'))
  .forEach(k => localStorage.removeItem(k));
```

## CI/CD

### GitHub Actions

Workflows run on push/PR:
- **Lint**: ESLint checks
- **Type Check**: TypeScript compilation
- **Test**: Unit and integration tests
- **Build**: Production builds

### Pre-commit Hooks

Install husky for pre-commit checks:
```bash
npm run prepare  # Sets up Git hooks
```

Runs before each commit:
- Linting
- Type checking
- Format checking

## Version Control

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `docs/*`: Documentation updates

### Commit Messages

Follow conventional commits:
```
feat(provider): add MyFeature provider
fix(websocket): handle reconnect edge case
docs(llm): update runbook with new commands
chore(deps): update axios to 1.6.0
```

### Creating a Release

1. Create release branch: `git checkout -b release/v1.2.0`
2. Update version in `package.json`
3. Update CHANGELOG.md
4. Commit: `git commit -m "chore: bump version to 1.2.0"`
5. Merge to main
6. Tag: `git tag v1.2.0`
7. Push: `git push origin v1.2.0`
8. GitHub Actions will build and publish
