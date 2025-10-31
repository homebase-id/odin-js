# Network Module Documentation

## Overview

The **Network module** manages social connections and relationships:

- **Connections**: Identity-to-identity connections
- **Circles**: Grouping and organizing connections
- **Contacts**: Contact information management
- **Follows**: Following other identities
- **Permissions**: Network-based access control
- **Connection Requests**: Managing pending connections
- **Introductions**: Third-party connection introductions

---

## File Structure

```
network/
├── network.ts                              # Module exports
├── connection/
│   ├── ConnectionManager.ts               # Connection operations
│   ├── ConnectionRequestManager.ts         # Request handling
│   └── IntroductionManager.ts             # Introduction management
├── circle/
│   ├── CircleProvider.ts                  # Circle CRUD
│   ├── CircleMembershipManager.ts         # Member management
│   ├── CircleDomainMembershipManager.ts   # Domain membership
│   └── CircleDataTypes.ts                 # Circle types
├── contact/
│   ├── ContactManager.ts                  # Contact management
│   └── ContactTypes.ts                    # Contact types
├── follow/
│   └── FollowManager.ts                   # Follow operations
├── permission/
│   └── PermissionTypes.ts                 # Permission types
└── troubleshooting/
    └── ConnectionGrantProvider.ts          # Connection troubleshooting
```

---

## API Reference

### ConnectionManager

#### getConnections()

```typescript
async getConnections(
  dotYouClient: DotYouClient,
  status?: ConnectionStatus
): Promise<Connection[]>;
```

Retrieves all connections, optionally filtered by status.

---

#### sendConnectionRequest()

```typescript
async sendConnectionRequest(
  dotYouClient: DotYouClient,
  targetIdentity: string,
  message?: string
): Promise<void>;
```

Sends a connection request to another identity.

**Example**:
```typescript
import { sendConnectionRequest } from '@homebase-id/js-lib/network';

await sendConnectionRequest(
  client,
  'bob.dotyou.cloud',
  'Hi Bob, let\'s connect!'
);
```

---

#### acceptConnectionRequest()

```typescript
async acceptConnectionRequest(
  dotYouClient: DotYouClient,
  requestId: string
): Promise<void>;
```

Accepts a pending connection request.

---

#### removeConnection()

```typescript
async removeConnection(
  dotYouClient: DotYouClient,
  identity: string
): Promise<void>;
```

Removes an existing connection.

---

### CircleProvider

#### getCircles()

```typescript
async getCircles(
  dotYouClient: DotYouClient
): Promise<Circle[]>;
```

Lists all circles.

---

#### createCircle()

```typescript
async createCircle(
  dotYouClient: DotYouClient,
  circle: CircleDefinition
): Promise<string>;
```

Creates a new circle.

**Example**:
```typescript
import { createCircle } from '@homebase-id/js-lib/network';

const circleId = await createCircle(client, {
  name: 'Close Friends',
  description: 'My closest friends',
  permissions: {
    allowRead: true,
    allowWrite: false
  }
});
```

---

### CircleMembershipManager

#### addMemberToCircle()

```typescript
async addMemberToCircle(
  dotYouClient: DotYouClient,
  circleId: string,
  identity: string
): Promise<void>;
```

Adds a connection to a circle.

---

#### removeMemberFromCircle()

```typescript
async removeMemberFromCircle(
  dotYouClient: DotYouClient,
  circleId: string,
  identity: string
): Promise<void>;
```

Removes a member from a circle.

---

### FollowManager

#### followIdentity()

```typescript
async followIdentity(
  dotYouClient: DotYouClient,
  targetIdentity: string
): Promise<void>;
```

Follows an identity (asymmetric relationship).

---

#### unfollowIdentity()

```typescript
async unfollowIdentity(
  dotYouClient: DotYouClient,
  targetIdentity: string
): Promise<void>;
```

Unfollows an identity.

---

#### getFollowers()

```typescript
async getFollowers(
  dotYouClient: DotYouClient
): Promise<string[]>;
```

Gets list of identities following you.

---

#### getFollowing()

```typescript
async getFollowing(
  dotYouClient: DotYouClient
): Promise<string[]>;
```

Gets list of identities you're following.

---

## Common Patterns

### Pattern 1: Connect with Another Identity

```typescript
import { sendConnectionRequest, getConnections } from '@homebase-id/js-lib/network';

// Send request
await sendConnectionRequest(client, 'bob.dotyou.cloud', 'Hi!');

// Later: check connection status
const connections = await getConnections(client);
const bobConnection = connections.find(c => c.identity === 'bob.dotyou.cloud');

if (bobConnection?.status === 'connected') {
  console.log('Connected with Bob!');
}
```

---

### Pattern 2: Organize Connections in Circles

```typescript
import { createCircle, addMemberToCircle } from '@homebase-id/js-lib/network';

// Create circle
const familyCircleId = await createCircle(client, {
  name: 'Family',
  permissions: { allowRead: true, allowWrite: true }
});

// Add members
await addMemberToCircle(client, familyCircleId, 'mom.dotyou.cloud');
await addMemberToCircle(client, familyCircleId, 'dad.dotyou.cloud');
```

---

### Pattern 3: Follow Public Identities

```typescript
import { followIdentity, getFollowing } from '@homebase-id/js-lib/network';

// Follow someone
await followIdentity(client, 'celebrity.dotyou.cloud');

// List all following
const following = await getFollowing(client);
console.log('Following', following.length, 'identities');
```

---

## Related Documentation

- [CORE_MODULE.md](./CORE_MODULE.md) - Permission and access control
- [PUBLIC_MODULE.md](./PUBLIC_MODULE.md) - Public posts and content

---

**Last Updated**: October 31, 2025  
**Module Path**: `packages/libs/js-lib/src/network/`
