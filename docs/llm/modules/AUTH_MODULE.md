# Auth Module Documentation

## Overview

The **Auth module** provides authentication and cryptographic key management for the Homebase ecosystem. It implements:

- **Authentication Flow**: Complete YouAuth protocol implementation
- **ECC Key Management**: P-384 elliptic curve cryptography
- **RSA Key Management**: RSA-OAEP key operations
- **Identity Management**: Identity lookup and verification
- **Browser Detection**: User agent and capability detection

This module works closely with the Core module and is essential for secure communication.

---

## File Structure

```
auth/
├── auth.ts                      # Module exports
├── helpers/
│   └── browserInfo.ts           # Browser detection utilities
└── providers/
    ├── AuthenticationProvider.ts # Main authentication flow
    ├── IdentityProvider.ts      # Identity operations
    ├── RsaKeyProvider.ts        # RSA key management
    └── EccKeyProvider.ts        # ECC key management
```

---

## Key Components

### 1. AuthenticationProvider

**Purpose**: Implements the complete YouAuth 3-phase authentication protocol.

**Key Features**:
- Pre-authentication setup
- Authorization request
- Authentication finalization
- Token management
- Shared secret derivation

### 2. EccKeyProvider

**Purpose**: Manages Elliptic Curve Cryptography (ECC) key pairs using P-384 curve.

**Key Features**:
- Key pair generation
- Public key export/import
- ECDH shared secret derivation
- Secure key storage

### 3. RsaKeyProvider

**Purpose**: Manages RSA key pairs for encryption and signing.

**Key Features**:
- Key pair generation
- Key import/export
- RSA-OAEP encryption/decryption
- Key persistence

### 4. IdentityProvider

**Purpose**: Handles identity lookups and verification.

**Key Features**:
- Identity domain resolution
- Identity verification
- Public key retrieval

---

## API Reference

### AuthenticationProvider

#### preAuth()

```typescript
async preAuth(
  identity: string,
  publicKey: Uint8Array
): Promise<{
  saltBytes: Uint8Array;
  saltKey64: string;
}>;
```

**Phase 1**: Initiates authentication by sending the client's public ECC key.

**Parameters**:
- `identity`: Target identity domain (e.g., 'alice.dotyou.cloud')
- `publicKey`: Client's ECC public key (raw bytes)

**Returns**: Server's salt for key derivation

**Example**:
```typescript
import { preAuth } from '@homebase-id/js-lib/auth';
import { getEccPublicKey } from '@homebase-id/js-lib/auth';

const publicKey = await getEccPublicKey();
const { saltBytes } = await preAuth('alice.dotyou.cloud', publicKey);
```

---

#### authorize()

```typescript
async authorize(
  identity: string,
  publicKey: Uint8Array
): Promise<string>;
```

**Phase 2**: Sends authorization request to the server.

**Parameters**:
- `identity`: Target identity
- `publicKey`: Client's ECC public key

**Returns**: Authorization token (used for finalization)

---

#### finalizeAuthentication()

```typescript
async finalizeAuthentication(
  identity: string,
  clientAuthToken: string,
  sharedSecret: Uint8Array
): Promise<{
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken?: string;
}>;
```

**Phase 3**: Completes authentication and retrieves access tokens.

**Parameters**:
- `identity`: Target identity
- `clientAuthToken`: Token from authorize()
- `sharedSecret`: Derived shared secret from ECDH

**Returns**: Access and refresh tokens

**Example**:
```typescript
const tokens = await finalizeAuthentication(
  identity,
  clientAuthToken,
  sharedSecret
);

// Store tokens securely
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('tokenExpiry', tokens.accessTokenExpiresAt.toString());
```

---

#### getToken()

```typescript
async getToken(
  identity: string
): Promise<string | null>;
```

Retrieves a valid access token, refreshing if necessary.

**Returns**: Access token or `null` if not authenticated

**Example**:
```typescript
const token = await getToken('alice.dotyou.cloud');
if (!token) {
  // Redirect to login
  window.location.href = '/login';
}
```

---

#### logout()

```typescript
async logout(identity: string): Promise<void>;
```

Logs out and clears all stored tokens and keys.

---

### EccKeyProvider

#### generateEccKey()

```typescript
async generateEccKey(): Promise<CryptoKeyPair>;
```

Generates a new ECC key pair using the P-384 curve.

**Returns**: CryptoKeyPair with public and private keys

**Example**:
```typescript
import { generateEccKey } from '@homebase-id/js-lib/auth';

const keyPair = await generateEccKey();
console.log('Generated ECC key pair');
```

---

#### getEccPublicKey()

```typescript
async getEccPublicKey(
  keyPair?: CryptoKeyPair
): Promise<Uint8Array>;
```

Exports the public key as raw bytes.

**Parameters**:
- `keyPair`: Key pair (optional, generates new if not provided)

**Returns**: Public key bytes (96 bytes for P-384)

---

#### importEccPublicKey()

```typescript
async importEccPublicKey(
  publicKeyBytes: Uint8Array
): Promise<CryptoKey>;
```

Imports a public key from raw bytes.

**Parameters**:
- `publicKeyBytes`: Raw public key bytes

**Returns**: CryptoKey object

---

#### deriveEccSharedSecret()

```typescript
async deriveEccSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  salt?: Uint8Array
): Promise<Uint8Array>;
```

Derives a shared secret using ECDH and HKDF.

**Parameters**:
- `privateKey`: Client's private key
- `publicKey`: Server's public key
- `salt`: Optional salt for HKDF (uses default if not provided)

**Returns**: 32-byte shared secret

**Example**:
```typescript
import { 
  deriveEccSharedSecret, 
  importEccPublicKey 
} from '@homebase-id/js-lib/auth';

// Import server's public key
const serverPublicKey = await importEccPublicKey(serverPublicKeyBytes);

// Derive shared secret
const sharedSecret = await deriveEccSharedSecret(
  myKeyPair.privateKey,
  serverPublicKey,
  saltBytes
);
```

---

#### storeEccKey()

```typescript
async storeEccKey(
  identity: string,
  keyPair: CryptoKeyPair
): Promise<void>;
```

Stores ECC key pair in localStorage (temporary storage).

**Note**: Keys are stored temporarily during authentication flow and cleared after.

---

#### getEccKey()

```typescript
async getEccKey(
  identity: string
): Promise<CryptoKeyPair | null>;
```

Retrieves stored ECC key pair.

---

#### clearEccKey()

```typescript
async clearEccKey(identity: string): Promise<void>;
```

Removes stored ECC key pair.

---

### RsaKeyProvider

#### generateRsaKey()

```typescript
async generateRsaKey(): Promise<CryptoKeyPair>;
```

Generates a new RSA key pair (2048-bit, OAEP padding).

---

#### exportRsaPublicKey()

```typescript
async exportRsaPublicKey(
  publicKey: CryptoKey
): Promise<string>;
```

Exports RSA public key in SPKI format (PEM-encoded).

**Returns**: Base64-encoded public key string

---

#### importRsaPublicKey()

```typescript
async importRsaPublicKey(
  publicKeyPem: string
): Promise<CryptoKey>;
```

Imports RSA public key from PEM format.

---

#### encryptWithRsa()

```typescript
async encryptWithRsa(
  data: Uint8Array,
  publicKey: CryptoKey
): Promise<Uint8Array>;
```

Encrypts data with RSA-OAEP.

**Example**:
```typescript
import { encryptWithRsa, importRsaPublicKey } from '@homebase-id/js-lib/auth';
import { stringToUint8Array } from '@homebase-id/js-lib/helpers';

const publicKey = await importRsaPublicKey(recipientPublicKeyPem);
const message = stringToUint8Array('Secret message');
const encrypted = await encryptWithRsa(message, publicKey);
```

---

#### decryptWithRsa()

```typescript
async decryptWithRsa(
  encryptedData: Uint8Array,
  privateKey: CryptoKey
): Promise<Uint8Array>;
```

Decrypts RSA-OAEP encrypted data.

---

### IdentityProvider

#### lookupIdentity()

```typescript
async lookupIdentity(
  domain: string
): Promise<{
  odinId: string;
  registrationDate: number;
}>;
```

Looks up identity information by domain.

**Parameters**:
- `domain`: Identity domain (e.g., 'alice.dotyou.cloud')

**Returns**: Identity details

**Example**:
```typescript
import { lookupIdentity } from '@homebase-id/js-lib/auth';

const identity = await lookupIdentity('alice.dotyou.cloud');
console.log('Odin ID:', identity.odinId);
console.log('Registered:', new Date(identity.registrationDate));
```

---

#### verifyIdentity()

```typescript
async verifyIdentity(
  domain: string,
  expectedOdinId: string
): Promise<boolean>;
```

Verifies an identity matches the expected Odin ID.

---

#### getIdentityPublicKey()

```typescript
async getIdentityPublicKey(
  domain: string
): Promise<string>;
```

Retrieves the public ECC key for an identity.

**Returns**: Base64-encoded public key

---

## Type Definitions

### AuthenticationResult

```typescript
interface AuthenticationResult {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken?: string;
  sharedSecret: Uint8Array;
  identity: string;
}
```

---

### PreAuthResponse

```typescript
interface PreAuthResponse {
  saltBytes: Uint8Array;
  saltKey64: string;
}
```

---

### EccKeyPair

```typescript
interface EccKeyPair extends CryptoKeyPair {
  publicKey: CryptoKey;  // P-384 public key
  privateKey: CryptoKey; // P-384 private key
}
```

---

## Common Patterns

### Pattern 1: Complete Authentication Flow

```typescript
import {
  generateEccKey,
  getEccPublicKey,
  preAuth,
  authorize,
  deriveEccSharedSecret,
  importEccPublicKey,
  finalizeAuthentication,
  storeEccKey,
  clearEccKey
} from '@homebase-id/js-lib/auth';

async function authenticate(identity: string) {
  // Step 1: Generate ECC key pair
  const eccKeyPair = await generateEccKey();
  const publicKeyBytes = await getEccPublicKey(eccKeyPair);
  
  // Step 2: Pre-auth (get server salt)
  const { saltBytes } = await preAuth(identity, publicKeyBytes);
  
  // Step 3: Authorize (user approves on server)
  const clientAuthToken = await authorize(identity, publicKeyBytes);
  
  // User is redirected to server for approval...
  // After approval, continue:
  
  // Step 4: Get server's public key
  const serverPublicKeyBytes = await getServerPublicKey(identity);
  const serverPublicKey = await importEccPublicKey(serverPublicKeyBytes);
  
  // Step 5: Derive shared secret
  const sharedSecret = await deriveEccSharedSecret(
    eccKeyPair.privateKey,
    serverPublicKey,
    saltBytes
  );
  
  // Step 6: Finalize authentication
  const tokens = await finalizeAuthentication(
    identity,
    clientAuthToken,
    sharedSecret
  );
  
  // Step 7: Store tokens
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('sharedSecret', base64Encode(sharedSecret));
  
  // Step 8: Clean up temporary keys
  await clearEccKey(identity);
  
  return { tokens, sharedSecret };
}
```

---

### Pattern 2: Token Management with Auto-Refresh

```typescript
import { getToken } from '@homebase-id/js-lib/auth';

async function makeAuthenticatedRequest(identity: string, endpoint: string) {
  // Get token (auto-refreshes if expired)
  const token = await getToken(identity);
  
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  // Make request with token
  const response = await fetch(`https://${identity}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
}
```

---

### Pattern 3: RSA Encryption for Peer Communication

```typescript
import { 
  generateRsaKey,
  exportRsaPublicKey,
  encryptWithRsa,
  decryptWithRsa,
  importRsaPublicKey
} from '@homebase-id/js-lib/auth';
import { stringToUint8Array, uint8ArrayToString } from '@homebase-id/js-lib/helpers';

// Generate key pair
const keyPair = await generateRsaKey();
const publicKeyPem = await exportRsaPublicKey(keyPair.publicKey);

// Share public key with peer
sharePub licKey(publicKeyPem);

// Encrypt message to peer
const peerPublicKey = await importRsaPublicKey(peerPublicKeyPem);
const message = stringToUint8Array('Hello from Alice!');
const encrypted = await encryptWithRsa(message, peerPublicKey);

// Send encrypted message
sendMessage(encrypted);

// Decrypt received message
const decrypted = await decryptWithRsa(receivedData, keyPair.privateKey);
const plaintext = uint8ArrayToString(decrypted);
console.log('Received:', plaintext);
```

---

### Pattern 4: Identity Verification

```typescript
import { lookupIdentity, verifyIdentity } from '@homebase-id/js-lib/auth';

async function verifyConnection(domain: string, claimedOdinId: string) {
  try {
    // Lookup identity
    const identity = await lookupIdentity(domain);
    
    // Verify matches claimed ID
    const isValid = await verifyIdentity(domain, claimedOdinId);
    
    if (!isValid) {
      console.error('Identity verification failed!');
      return false;
    }
    
    console.log('Identity verified:', identity.odinId);
    return true;
    
  } catch (error) {
    console.error('Identity lookup failed:', error);
    return false;
  }
}
```

---

### Pattern 5: Logout and Cleanup

```typescript
import { logout, clearEccKey } from '@homebase-id/js-lib/auth';

async function performLogout(identity: string) {
  try {
    // Clear server session
    await logout(identity);
    
    // Clear local keys
    await clearEccKey(identity);
    
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sharedSecret');
    
    // Redirect to login
    window.location.href = '/login';
    
  } catch (error) {
    console.error('Logout failed:', error);
  }
}
```

---

## Best Practices

### ✅ DO:

1. **Always use HTTPS for authentication**
   ```typescript
   // Good: HTTPS enforced
   const identity = 'alice.dotyou.cloud'; // https:// is implied
   ```

2. **Store shared secrets securely**
   ```typescript
   // Good: Use secure storage
   const sharedSecret = await deriveEccSharedSecret(...);
   secureStorage.set('sharedSecret', sharedSecret);
   ```

3. **Clean up temporary keys after authentication**
   ```typescript
   await finalizeAuthentication(...);
   await clearEccKey(identity); // Clean up
   ```

4. **Validate tokens before making requests**
   ```typescript
   const token = await getToken(identity);
   if (!token) {
     // Re-authenticate
   }
   ```

5. **Use auto-refresh for long-lived sessions**
   ```typescript
   // getToken() automatically refreshes
   const token = await getToken(identity);
   ```

### ❌ DON'T:

1. **Don't log sensitive keys or secrets**
   ```typescript
   // Bad
   console.log('Shared secret:', sharedSecret);
   
   // Good
   console.log('Authentication successful');
   ```

2. **Don't store keys in plain localStorage indefinitely**
   ```typescript
   // Bad: permanent storage
   localStorage.setItem('privateKey', privateKeyPem);
   
   // Good: temporary storage during auth only
   await storeEccKey(identity, keyPair); // auto-cleared
   ```

3. **Don't skip identity verification**
   ```typescript
   // Bad: trusting without verification
   const identity = userInput;
   await connectToIdentity(identity);
   
   // Good: verify first
   const isValid = await verifyIdentity(identity, expectedId);
   if (isValid) {
     await connectToIdentity(identity);
   }
   ```

4. **Don't reuse ECC key pairs**
   ```typescript
   // Bad: reusing keys across sessions
   const cachedKeyPair = loadCachedKey();
   
   // Good: generate fresh keys
   const keyPair = await generateEccKey();
   ```

---

## Security Considerations

1. **ECC Curve**: Uses P-384 (NIST curve) for 192-bit security level
2. **ECDH**: Elliptic Curve Diffie-Hellman for key agreement
3. **HKDF**: HMAC-based Key Derivation Function for shared secret derivation
4. **RSA Key Size**: 2048-bit minimum for RSA operations
5. **Token Expiry**: Access tokens expire and must be refreshed
6. **Salt Usage**: Server-provided salt prevents rainbow table attacks
7. **Key Storage**: Temporary ECC keys stored only during authentication

---

## Performance Tips

1. **Key Generation**: Generate ECC keys early (they're needed for auth)
2. **Caching**: Cache identity lookups (they rarely change)
3. **Token Reuse**: Use getToken() to avoid unnecessary refreshes
4. **Batch Operations**: Verify multiple identities in parallel

---

## Troubleshooting

### Issue: "Failed to derive shared secret"

**Cause**: Mismatched key types or invalid keys

**Solution**:
```typescript
// Ensure both keys are P-384 ECC keys
const serverKey = await importEccPublicKey(serverKeyBytes);
const sharedSecret = await deriveEccSharedSecret(
  myPrivateKey,
  serverKey,
  salt
);
```

---

### Issue: "Token expired"

**Cause**: Access token has expired

**Solution**:
```typescript
// Use getToken() - it auto-refreshes
const token = await getToken(identity);

// Or manually refresh
await refreshToken(identity);
```

---

### Issue: "Identity not found"

**Cause**: Invalid domain or identity doesn't exist

**Solution**:
```typescript
try {
  const identity = await lookupIdentity(domain);
} catch (error) {
  if (error.response?.status === 404) {
    console.error('Identity does not exist');
  }
}
```

---

## Related Documentation

- [AUTHENTICATION.md](../AUTHENTICATION.md) - Complete authentication guide
- [CORE_MODULE.md](./CORE_MODULE.md) - DotYouClient and API usage
- [HELPERS_MODULE.md](./HELPERS_MODULE.md) - Encryption utilities

---

**Last Updated**: October 31, 2025  
**Module Path**: `packages/libs/js-lib/src/auth/`
