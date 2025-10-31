# Profile Module Documentation

## Overview

The **Profile module** manages identity profile data and attributes:

- **Profile Definitions**: Schema for profile fields
- **Profile Data**: Reading and updating profile information
- **Attributes**: Custom profile attributes
- **Attribute Configuration**: Attribute type definitions
- **Profile Validation**: Data validation and constraints

---

## File Structure

```
profile/
├── profile.ts                        # Module exports
├── AttributeData/
│   ├── AttributeConfig.ts           # Attribute definitions
│   ├── AttributeDataProvider.ts      # Attribute operations
│   └── AttributeDataTypes.ts         # Attribute types
└── ProfileData/
    ├── ProfileConfig.ts              # Profile configuration
    ├── ProfileTypes.ts               # Profile type definitions
    └── ProfileDefinitionManager.ts   # Profile schema management
```

---

## API Reference

### ProfileDefinitionManager

#### getProfileDefinition()

```typescript
async getProfileDefinition(
  dotYouClient: DotYouClient
): Promise<ProfileDefinition>;
```

Retrieves the profile schema definition.

---

#### updateProfileDefinition()

```typescript
async updateProfileDefinition(
  dotYouClient: DotYouClient,
  definition: ProfileDefinition
): Promise<void>;
```

Updates the profile schema.

---

### AttributeDataProvider

#### getAttributes()

```typescript
async getAttributes(
  dotYouClient: DotYouClient,
  identity?: string
): Promise<AttributeMap>;
```

Retrieves profile attributes.

**Example**:
```typescript
import { getAttributes } from '@homebase-id/js-lib/profile';

const attributes = await getAttributes(client);
console.log('Name:', attributes.displayName);
console.log('Bio:', attributes.bio);
```

---

#### updateAttribute()

```typescript
async updateAttribute<T>(
  dotYouClient: DotYouClient,
  key: string,
  value: T
): Promise<void>;
```

Updates a single profile attribute.

**Example**:
```typescript
import { updateAttribute } from '@homebase-id/js-lib/profile';

await updateAttribute(client, 'bio', 'Software developer and coffee enthusiast');
```

---

#### updateAttributes()

```typescript
async updateAttributes(
  dotYouClient: DotYouClient,
  attributes: Partial<AttributeMap>
): Promise<void>;
```

Updates multiple attributes at once.

---

## Common Patterns

### Pattern 1: Update Profile Information

```typescript
import { updateAttributes } from '@homebase-id/js-lib/profile';

await updateAttributes(client, {
  displayName: 'Alice Smith',
  bio: 'Developer | Designer | Creator',
  location: 'San Francisco, CA',
  website: 'https://alice.example.com'
});
```

---

### Pattern 2: Read Public Profile

```typescript
import { getAttributes } from '@homebase-id/js-lib/profile';

const bobProfile = await getAttributes(client, 'bob.dotyou.cloud');
console.log(`${bobProfile.displayName} - ${bobProfile.bio}`);
```

---

## Related Documentation

- [NETWORK_MODULE.md](./NETWORK_MODULE.md) - Connection management
- [PUBLIC_MODULE.md](./PUBLIC_MODULE.md) - Public profile cards

---

**Last Updated**: October 31, 2025  
**Module Path**: `packages/libs/js-lib/src/profile/`
