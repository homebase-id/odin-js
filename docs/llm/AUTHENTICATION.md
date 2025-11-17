# Authentication Guide

Complete reference for implementing authentication in Homebase applications using the js-lib authentication system.

## Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Core Concepts](#core-concepts)
4. [Implementation Patterns](#implementation-patterns)
5. [API Reference](#api-reference)
6. [Security Considerations](#security-considerations)
7. [Common Patterns](#common-patterns)

---

## Overview

Homebase uses a **YouAuth** protocol for authentication, which implements:

- **ECC (Elliptic Curve Cryptography)** key exchange (P-384 curve)
- **ECDH** (Elliptic Curve Diffie-Hellman) shared secret generation
- **HKDF** (HMAC-based Key Derivation Function) for key derivation
- **AES-CBC** encryption for token exchange
- **localStorage** for client-side credential persistence

### Key Components

- **DotYouClient**: Main client for API communication
- **YouAuth Authorization**: OAuth-like flow with ECC key exchange
- **Token Verification**: Periodic validation of authentication state
- **Drive Permissions**: Granular access control for data storage
- **Circle Permissions**: Access control for social connections

---

## Authentication Flow

### 1. Pre-Authorization Phase

```typescript
import { preAuth } from '@homebase-id/js-lib/auth';
import { useDotYouClient } from '@homebase-id/common-app';

const { getDotYouClient } = useDotYouClient();
await preAuth(getDotYouClient());
```

**Purpose**: Establishes initial connection with the identity server and prepares for authentication.

**Endpoint**: `POST /notify/preauth`

---

### 2. Authorization Request Phase

This phase creates the authorization parameters and redirects the user to the identity server.

```typescript
import {
  createEccPair,
  saveEccKey,
  getRegistrationParams,
  YouAuthorizationParams,
} from '@homebase-id/js-lib/auth';

// Step 1: Generate ECC key pair for secure exchange
const eccKey = await createEccPair();

// Step 2: Persist the private key for later use in finalization
await saveEccKey(eccKey);

// Step 3: Build authorization parameters
const finalizeUrl = `${window.location.origin}/auth/finalize`;
const params: YouAuthorizationParams = await getRegistrationParams(
  finalizeUrl, // Where to redirect after auth
  'My App Name', // Display name
  'app-uuid', // Unique app identifier
  permissions, // Array of AppPermissionType values
  circlePermissions, // Optional circle permission keys
  drives, // Array of TargetDriveAccessRequest
  circleDrives, // Optional circle drive access
  circles, // Optional circle IDs (e.g., CONFIRMED_CONNECTIONS_CIRCLE_ID)
  eccKey.publicKey, // Public key for exchange
  'myapp.example.com', // Optional: custom host/domain
  'Device Name', // Optional: client-friendly name
  returnUrl // Optional: post-auth redirect
);

// Step 4: Redirect user to identity server
const authUrl = `https://${identity}/api/owner/v1/youauth/authorize?${new URLSearchParams(params)}`;
window.location.href = authUrl;
```

**Parameters Explained**:

- **finalizeUrl**: Where the identity server redirects after authorization
- **appName**: Human-readable app name shown during authorization
- **appId**: Unique UUID identifying your app
- **permissions**: Array of `AppPermissionType` enums (e.g., `SendDataToOtherIdentitiesOnMyBehalf`)
- **drives**: Array of drive access requests with permissions
- **eccKey.publicKey**: Public portion of ECC key pair for secure exchange
- **host**: Optional custom domain (for multi-tenant apps)
- **returnUrl**: Final URL to redirect user after successful auth

---

### 3. Finalization Phase

After the user authorizes, the identity server redirects to your `finalizeUrl` with query parameters:

```
/auth/finalize?identity=user.domain.com&public_key=base64...&salt=base64...&state=returnUrl
```

**Implementation**:

```typescript
import {
  retrieveEccKey,
  finalizeAuthentication,
  saveIdentity,
  throwAwayTheECCKey,
} from '@homebase-id/js-lib/auth';
import { APP_AUTH_TOKEN, APP_SHARED_SECRET } from '@homebase-id/common-app';

async function finalizeAuthorization(
  identity: string,
  publicKey: string,
  salt: string
): Promise<boolean> {
  try {
    // Step 1: Retrieve the private key saved during authorization
    const privateKey = await retrieveEccKey();
    if (!privateKey) throw new Error('Failed to retrieve key');

    // Step 2: Perform key exchange and decrypt tokens
    const { clientAuthToken, sharedSecret } = await finalizeAuthentication(
      identity,
      privateKey,
      publicKey,
      salt
    );

    // Step 3: Persist credentials to localStorage
    saveIdentity(identity);
    localStorage.setItem(APP_SHARED_SECRET, sharedSecret);
    localStorage.setItem(APP_AUTH_TOKEN, clientAuthToken);

    // Step 4: Clean up temporary ECC key
    throwAwayTheECCKey();

    // Step 5: Invalidate query cache to trigger re-auth checks
    // queryClient.invalidateQueries({ queryKey: ['verify-token'] });

    return true;
  } catch (ex) {
    console.error('Finalization failed:', ex);
    return false;
  }
}
```

**What Happens Internally**:

1. **ECDH Key Exchange**: Combines local private key with server's public key
2. **HKDF Derivation**: Derives shared AES-CBC key using salt
3. **Token Exchange**: Sends SHA-256 digest of shared secret to `/youauth/token`
4. **Decryption**: Decrypts `clientAuthToken` and `sharedSecret` using exchanged key
5. **Storage**: Persists tokens in localStorage for subsequent requests

---

## Core Concepts

### ECC Key Management

**Generation**:

```typescript
const eccKeyPair: CryptoKeyPair = await createEccPair();
// Uses P-384 curve, suitable for 'deriveKey' and 'deriveBits'
```

**Storage**:

```typescript
await saveEccKey(eccKeyPair);
// Exports private key as PKCS#8 and stores base64 in localStorage['ecc-pk']
```

**Retrieval**:

```typescript
const privateKey: CryptoKey | undefined = await retrieveEccKey();
// Imports from localStorage and reconstructs CryptoKey
```

**Cleanup**:

```typescript
throwAwayTheECCKey();
// Removes 'ecc-pk' from localStorage after finalization
```

---

### Shared Secret Derivation

The shared secret is derived using **ECDH + HKDF**:

```typescript
// 1. ECDH: Derive bits from local private + remote public keys
const derivedBits = await crypto.subtle.deriveBits(
  { name: 'ECDH', public: remotePublicKey },
  privateKey,
  384 // P-384 = 384 bits
);

// 2. Import as HKDF key
const hkdfKey = await crypto.subtle.importKey('raw', derivedBits, { name: 'HKDF' }, false, [
  'deriveKey',
]);

// 3. Derive AES-CBC key using salt
const aesKey = await crypto.subtle.deriveKey(
  {
    name: 'HKDF',
    hash: 'SHA-256',
    salt: base64ToUint8Array(salt),
    info: new Uint8Array([]),
  },
  hkdfKey,
  { name: 'AES-CBC', length: 128 },
  true,
  ['encrypt', 'decrypt']
);

// 4. Export raw shared secret
const sharedSecret = await crypto.subtle.exportKey('raw', aesKey);
```

---

### Token Storage

**Client Auth Token**:

```typescript
localStorage.setItem(APP_AUTH_TOKEN, clientAuthToken);
// Base64-encoded token used for authenticated API requests
```

**Shared Secret**:

```typescript
localStorage.setItem(APP_SHARED_SECRET, sharedSecret);
// Base64-encoded secret for encrypting/decrypting data
```

**Identity**:

```typescript
saveIdentity('user.domain.com');
// Stored in localStorage['identity']
```

---

### Token Verification

Periodically verify the token is still valid:

```typescript
import { hasValidToken } from '@homebase-id/js-lib/auth';

const isValid: boolean | null = await hasValidToken(dotYouClient);
// true: valid, false: invalid/expired, null: couldn't verify
```

**Endpoint**: `GET /auth/verifytoken`

**Response Codes**:

- `200`: Token is valid
- `401/403`: Token is invalid or expired
- Other: Verification couldn't be performed

---

## Implementation Patterns

### Pattern 1: React Hook for Auth Validation

```typescript
import { useEffect } from 'react';
import { useVerifyToken } from './useVerifyToken';
import { useDotYouClient, logoutOwnerAndAllApps } from '@homebase-id/common-app';

export const useValidateAuthorization = () => {
  const { hasSharedSecret } = useDotYouClient();
  const { data: hasValidToken, isFetched } = useVerifyToken();

  useEffect(() => {
    if (isFetched && hasValidToken !== undefined) {
      if (!hasValidToken && hasSharedSecret) {
        console.warn('Token is invalid, logging out..');
        logoutOwnerAndAllApps();
      }
    }
  }, [hasValidToken, hasSharedSecret, isFetched]);
};
```

**Usage**: Call this hook in your root component to ensure token validity.

---

### Pattern 2: Token Verification Hook

```typescript
import { useQuery, QueryClient } from '@tanstack/react-query';
import { hasValidToken } from '@homebase-id/js-lib/auth';
import { useDotYouClientContext } from '@homebase-id/common-app';

const MINUTE_IN_MS = 60000;

export const useVerifyToken = () => {
  const dotYouClient = useDotYouClientContext();
  const isAuthenticated = dotYouClient.isAuthenticated();

  return useQuery({
    queryKey: ['verify-app-token'],
    queryFn: async () => {
      // When hasValidToken returns undefined, assume valid to avoid unnecessary logouts
      return (await hasValidToken(dotYouClient)) ?? true;
    },
    refetchOnMount: false,
    staleTime: MINUTE_IN_MS * 10, // 10 minutes
    enabled: isAuthenticated,
  });
};

export const invalidateVerifyToken = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['verify-app-token'] });
};
```

---

### Pattern 3: Complete Auth Hook

```typescript
import { useQueryClient } from '@tanstack/react-query';
import {
  createEccPair,
  saveEccKey,
  retrieveEccKey,
  getRegistrationParams,
  finalizeAuthentication,
  saveIdentity,
  throwAwayTheECCKey,
  preAuth,
  YouAuthorizationParams,
  TargetDriveAccessRequest,
} from '@homebase-id/js-lib/auth';
import { APP_AUTH_TOKEN, APP_SHARED_SECRET, useDotYouClient } from '@homebase-id/common-app';
import { invalidateVerifyToken } from './useVerifyToken';

export const useYouAuthAuthorization = () => {
  const queryClient = useQueryClient();
  const { getDotYouClient } = useDotYouClient();

  const getAuthorizationParameters = async (returnUrl: string): Promise<YouAuthorizationParams> => {
    const eccKey = await createEccPair();
    await saveEccKey(eccKey);

    const finalizeUrl = `${window.location.origin}/auth/finalize`;
    return getRegistrationParams(
      finalizeUrl,
      'My App Name',
      'app-uuid',
      permissions,
      undefined,
      drives,
      circleDrives,
      circles,
      eccKey.publicKey,
      window.location.host,
      undefined,
      returnUrl
    );
  };

  const finalizeAuthorization = async (
    identity: string,
    publicKey: string,
    salt: string
  ): Promise<boolean> => {
    try {
      const privateKey = await retrieveEccKey();
      if (!privateKey) throw new Error('Failed to retrieve key');

      const { clientAuthToken, sharedSecret } = await finalizeAuthentication(
        identity,
        privateKey,
        publicKey,
        salt
      );

      saveIdentity(identity);
      localStorage.setItem(APP_SHARED_SECRET, sharedSecret);
      localStorage.setItem(APP_AUTH_TOKEN, clientAuthToken);
      invalidateVerifyToken(queryClient);
      throwAwayTheECCKey();

      return true;
    } catch (ex) {
      console.error(ex);
      return false;
    }
  };

  const performPreAuth = async (): Promise<void> => {
    await preAuth(getDotYouClient());
  };

  return {
    getAuthorizationParameters,
    finalizeAuthorization,
    preauth: performPreAuth,
  };
};
```

---

### Pattern 4: Auth Finalize Component

```typescript
import { useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useYouAuthAuthorization } from '../hooks/auth/useAuth';

const AuthFinalize = () => {
  const isRunning = useRef(false);
  const [searchParams] = useSearchParams();
  const { finalizeAuthorization } = useYouAuthAuthorization();
  const [finalizeState, setFinalizeState] = useState<undefined | 'success' | 'error'>();

  const identity = searchParams.get('identity');
  const public_key = searchParams.get('public_key');
  const salt = searchParams.get('salt');
  const returnUrl = searchParams.get('state');

  useEffect(() => {
    (async () => {
      if (!identity || !public_key || !salt) return;
      if (isRunning.current) return;

      isRunning.current = true;
      const authState = await finalizeAuthorization(identity, public_key, salt);
      setFinalizeState(authState ? 'success' : 'error');
    })();
  }, [identity, public_key, salt]);

  // Redirect on error
  if (!identity || !public_key || !salt) {
    return <Navigate to="/auth" />;
  }
  if (finalizeState === 'error') {
    return <Navigate to="/auth?state=finalize-error" />;
  }

  // Redirect on success
  useEffect(() => {
    if (finalizeState === 'success') {
      window.location.href = returnUrl || '/';
    }
  }, [finalizeState, returnUrl]);

  return <div>Finalizing authentication...</div>;
};

export default AuthFinalize;
```

---

## API Reference

### Core Functions

#### `createEccPair()`

```typescript
const eccKeyPair: CryptoKeyPair = await createEccPair();
```

Generates a new ECC key pair using P-384 curve.

#### `saveEccKey(keyPair: CryptoKeyPair)`

```typescript
await saveEccKey(eccKeyPair);
```

Exports and stores the private key in localStorage as base64.

#### `retrieveEccKey()`

```typescript
const privateKey: CryptoKey | undefined = await retrieveEccKey();
```

Retrieves and imports the stored private key from localStorage.

#### `throwAwayTheECCKey()`

```typescript
throwAwayTheECCKey();
```

Removes the temporary ECC private key from localStorage.

#### `getRegistrationParams(...)`

```typescript
const params: YouAuthorizationParams = await getRegistrationParams(
  finalizeUrl: string,
  appName: string,
  appId: string,
  permissionKeys: number[] | undefined,
  circlePermissionKeys: number[] | undefined,
  drives: TargetDriveAccessRequest[],
  circleDrives: TargetDriveAccessRequest[] | undefined,
  circles: string[] | undefined,
  eccPublicKey: CryptoKey,
  host?: string,
  clientFriendlyName?: string,
  state?: string
): Promise<YouAuthorizationParams>
```

Builds the authorization URL parameters for the YouAuth flow.

#### `finalizeAuthentication(...)`

```typescript
const result: { clientAuthToken: string; sharedSecret: string } =
  await finalizeAuthentication(
    identity: string,
    privateKey: CryptoKey,
    publicKey: string,
    salt: string
  );
```

Performs ECDH key exchange and decrypts auth tokens.

#### `hasValidToken(dotYouClient)`

```typescript
const isValid: boolean | null = await hasValidToken(dotYouClient);
```

Verifies if the current auth token is valid.

#### `preAuth(dotYouClient)`

```typescript
await preAuth(dotYouClient);
```

Performs pre-authorization handshake with the identity server.

#### `saveIdentity(identity: string)`

```typescript
saveIdentity('user.domain.com');
```

Stores the user's identity in localStorage.

#### `retrieveIdentity()`

```typescript
const identity: string = retrieveIdentity();
```

Retrieves the stored identity from localStorage.

#### `logout(dotYouClient)`

```typescript
await logout(dotYouClient);
```

Logs out the current user and invalidates tokens.

---

### Permission Types

#### `AppPermissionType` (from `@homebase-id/js-lib/network`)

```typescript
enum AppPermissionType {
  SendDataToOtherIdentitiesOnMyBehalf = 1,
  ReadConnectionRequests = 2,
  ReadConnections = 4,
  SendPushNotifications = 8,
  SendIntroductions = 16,
  ReceiveDataFromOtherIdentitiesOnMyBehalf = 32,
  ReadCircleMembers = 64,
  ReadWhoIFollow = 128,
  ReadMyFollowers = 256,
  ManageFeed = 512,
  PublishStaticContent = 1024,
}
```

#### `DrivePermissionType` (from `@homebase-id/js-lib/core`)

```typescript
enum DrivePermissionType {
  Read = 1,
  Write = 2,
  React = 4,
  Comment = 8,
}
```

---

### Drive Configuration

#### `TargetDriveAccessRequest`

```typescript
interface TargetDriveAccessRequest extends TargetDrive {
  name: string;
  description: string;
  permissions: DrivePermissionType[];
  attributes?: Record<string, string>;
  allowAnonymousRead?: boolean;
  allowSubscriptions?: boolean;
}
```

**Example**:

```typescript
const drives: TargetDriveAccessRequest[] = [
  {
    alias: 'unique-drive-alias',
    type: 'unique-drive-type-uuid',
    name: 'My App Drive',
    description: 'Stores app data',
    permissions: [DrivePermissionType.Read, DrivePermissionType.Write, DrivePermissionType.React],
    allowAnonymousRead: false,
    allowSubscriptions: true,
  },
];
```

---

### Circle Configuration

**Predefined Circle IDs**:

```typescript
import {
  CONFIRMED_CONNECTIONS_CIRCLE_ID,
  AUTO_CONNECTIONS_CIRCLE_ID,
} from '@homebase-id/js-lib/network';

const circles = [
  CONFIRMED_CONNECTIONS_CIRCLE_ID, // Confirmed connections only
  AUTO_CONNECTIONS_CIRCLE_ID, // All connections
];
```

---

## Security Considerations

### 1. ECC Key Storage

- Private keys are **temporarily** stored in localStorage during auth flow
- Keys are **automatically deleted** after finalization with `throwAwayTheECCKey()`
- Never persist ECC private keys long-term

### 2. Shared Secret Protection

- The shared secret is used to encrypt/decrypt all data
- Stored in localStorage (vulnerable to XSS)
- Implement proper Content Security Policy (CSP)
- Consider using `httpOnly` cookies for production

### 3. Token Expiration

- Tokens can expire or be revoked server-side
- Implement periodic token verification (every 10 minutes recommended)
- Auto-logout on invalid token to prevent stale sessions

### 4. HTTPS Requirement

- All authentication flows **require HTTPS**
- Never transmit credentials over HTTP

### 5. XSS Protection

- localStorage is vulnerable to XSS attacks
- Sanitize all user input
- Implement strict CSP headers
- Consider using `SameSite` cookies

### 6. CORS Configuration

- Identity server must whitelist your app's origin
- Use specific origins, avoid wildcards in production

---

## Common Patterns

### Pattern: Logout and Cleanup

```typescript
import { logout } from '@homebase-id/js-lib/auth';
import { logoutOwnerAndAllApps } from '@homebase-id/common-app';

// Single app logout
await logout(dotYouClient);

// Global logout (all apps + owner)
await logoutOwnerAndAllApps();
```

### Pattern: Conditional Auth Check

```typescript
const { isAuthenticated, hasSharedSecret } = useDotYouClient();

if (!isAuthenticated() || !hasSharedSecret) {
  // Redirect to /auth
  window.location.href = '/auth';
}
```

### Pattern: Auto-Authorize for Owner Apps

```typescript
import { OWNER_APPS_ROOT } from '@homebase-id/common-app';

const isOwnerApp = window.location.pathname.startsWith(OWNER_APPS_ROOT);

if (isOwnerApp) {
  // Skip manual auth, use auto-authorize flow
  // Owner is already authenticated via session cookie
}
```

### Pattern: Drive Permission Calculation

```typescript
const permissions = [
  DrivePermissionType.Read,
  DrivePermissionType.Write,
  DrivePermissionType.React,
];

// Calculate combined permission value
const permissionValue = permissions.reduce((acc, perm) => acc + perm, 0);
// Result: 7 (1 + 2 + 4)
```

### Pattern: Error Handling

```typescript
try {
  const { clientAuthToken, sharedSecret } = await finalizeAuthentication(
    identity,
    privateKey,
    publicKey,
    salt
  );
  // Success
} catch (error) {
  if (error.message.includes('Failed to retrieve key')) {
    // ECC key not found - user may have cleared localStorage
    // Restart auth flow
  } else if (error.response?.status === 403) {
    // User denied authorization
  } else {
    // Other error
    console.error('Auth failed:', error);
  }
}
```

---

## Example: Complete Chat App Auth

```typescript
// hooks/auth/useAuth.ts
import { DrivePermissionType } from '@homebase-id/js-lib/core';
import {
  finalizeAuthentication,
  getRegistrationParams,
  preAuth,
  saveIdentity,
  createEccPair,
  saveEccKey,
  retrieveEccKey,
  throwAwayTheECCKey,
  TargetDriveAccessRequest,
} from '@homebase-id/js-lib/auth';
import {
  AppPermissionType,
  AUTO_CONNECTIONS_CIRCLE_ID,
  CONFIRMED_CONNECTIONS_CIRCLE_ID,
  ContactConfig,
} from '@homebase-id/js-lib/network';
import {
  APP_AUTH_TOKEN,
  APP_SHARED_SECRET,
  CHAT_APP_ID,
  CHAT_ROOT_PATH,
  useDotYouClient,
} from '@homebase-id/common-app';
import { useQueryClient } from '@tanstack/react-query';

const ChatDrive = {
  alias: 'chat-drive-alias',
  type: 'chat-drive-type-uuid',
};

const drives: TargetDriveAccessRequest[] = [
  {
    ...ChatDrive,
    name: 'Chat Drive',
    description: 'Stores chat messages',
    permissions: [DrivePermissionType.Read, DrivePermissionType.Write, DrivePermissionType.React],
  },
  {
    ...ContactConfig.ContactTargetDrive,
    name: 'Contact Drive',
    description: 'Access to contacts',
    permissions: [DrivePermissionType.Read, DrivePermissionType.Write],
  },
];

const permissions = [
  AppPermissionType.SendDataToOtherIdentitiesOnMyBehalf,
  AppPermissionType.ReadConnectionRequests,
  AppPermissionType.ReadConnections,
  AppPermissionType.SendPushNotifications,
  AppPermissionType.ReceiveDataFromOtherIdentitiesOnMyBehalf,
];

const circleDrives: TargetDriveAccessRequest[] = [
  {
    alias: ChatDrive.alias,
    type: ChatDrive.type,
    name: 'Chat Drive',
    description: '',
    permissions: [DrivePermissionType.Write, DrivePermissionType.React],
  },
];

export const useYouAuthAuthorization = () => {
  const queryClient = useQueryClient();
  const { getDotYouClient } = useDotYouClient();

  const getAuthorizationParameters = async (returnUrl: string) => {
    const eccKey = await createEccPair();
    await saveEccKey(eccKey);

    const finalizeUrl = `${window.location.origin}${CHAT_ROOT_PATH}/auth/finalize`;
    return getRegistrationParams(
      finalizeUrl,
      'Homebase - Chat',
      CHAT_APP_ID,
      permissions,
      undefined,
      drives,
      circleDrives,
      [CONFIRMED_CONNECTIONS_CIRCLE_ID, AUTO_CONNECTIONS_CIRCLE_ID],
      eccKey.publicKey,
      window.location.host,
      undefined,
      returnUrl
    );
  };

  const finalizeAuthorization = async (identity: string, publicKey: string, salt: string) => {
    try {
      const privateKey = await retrieveEccKey();
      if (!privateKey) throw new Error('Failed to retrieve key');

      const { clientAuthToken, sharedSecret } = await finalizeAuthentication(
        identity,
        privateKey,
        publicKey,
        salt
      );

      saveIdentity(identity);
      localStorage.setItem(APP_SHARED_SECRET, sharedSecret);
      localStorage.setItem(APP_AUTH_TOKEN, clientAuthToken);
      queryClient.invalidateQueries({ queryKey: ['verify-token'] });
      throwAwayTheECCKey();

      return true;
    } catch (ex) {
      console.error(ex);
      return false;
    }
  };

  const performPreAuth = async () => {
    await preAuth(getDotYouClient());
  };

  return {
    getAuthorizationParameters,
    finalizeAuthorization,
    preauth: performPreAuth,
  };
};
```

---

## Troubleshooting

### "Failed to retrieve key" Error

**Cause**: ECC private key not found in localStorage.
**Solution**: User needs to restart the auth flow from the beginning.

### Token Verification Returns `null`

**Cause**: Network error or server unavailable.
**Solution**: Assume token is valid to avoid unnecessary logouts. Retry verification later.

### "Invalid token" After Successful Auth

**Cause**: Clock skew between client and server, or race condition.
**Solution**: Add a small delay before token verification, or retry once.

### localStorage Not Available

**Cause**: Private browsing mode or browser security settings.
**Solution**: Detect with `isLocalStorageAvailable()` and show appropriate error message.

### CORS Errors During Auth

**Cause**: Identity server not configured to accept requests from your origin.
**Solution**: Contact server administrator to whitelist your domain.

---

## Best Practices

1. **Always clean up ECC keys** after finalization with `throwAwayTheECCKey()`
2. **Implement token verification** with 10-minute stale time
3. **Handle auth errors gracefully** - show user-friendly messages
4. **Use HTTPS** in production - never send credentials over HTTP
5. **Validate all query parameters** in finalize callback
6. **Implement CSP headers** to mitigate XSS risks
7. **Use `useRef`** to prevent double-execution in React Strict Mode
8. **Invalidate query caches** after auth state changes
9. **Test auth flow** in incognito/private browsing mode
10. **Log errors** but don't expose sensitive details to users

---

## Related Documentation

- [Workspace Instructions](./WORKSPACE_INSTRUCTIONS.md) - Quick start patterns and common operations
- [Architecture Guide](./ARCHITECTURE.md) - System design and DotYouClient details
- [Code Map](./CODE_MAP.md) - File locations for drive, network, and security modules
- [Runbook](./RUNBOOK.md) - Development setup and authentication configuration
- [Glossary](./GLOSSARY.md) - Authentication terms and security concepts
