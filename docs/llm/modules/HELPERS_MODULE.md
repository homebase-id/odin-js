# Helpers Module Documentation

## Overview

The **Helpers module** provides utility functions for common operations throughout the Homebase ecosystem:

- **AES Encryption**: Symmetric encryption/decryption
- **Data Utilities**: Type conversions, encoding, and formatting
- **Hash Utilities**: Hashing and checksums
- **Browser Utilities**: Browser detection and capabilities
- **Domain Utilities**: Domain parsing and validation
- **Attribute Helpers**: Attribute type conversions and validation
- **Permission Helpers**: Permission checking and formatting
- **Image Processing**: Image merging and manipulation
- **Blob Helpers**: Binary data handling
- **Payload Generation**: Thumbnail and payload creation

---

## File Structure

```
helpers/
├── helpers.ts                         # Module exports
├── AesEncrypt.ts                      # AES-CBC encryption
├── DataUtil.ts                        # Data conversion utilities
├── HashUtil.ts                        # Hashing functions
├── BrowserUtil.ts                     # Browser detection
├── DomainUtil.ts                      # Domain parsing
├── AttributeHelpers.ts                # Attribute conversions
├── PermissionHelpers.ts               # Permission utilities
├── ImageMerger.ts                     # Image composition
├── BlobHelpers.ts                     # Binary data utilities
├── PayloadAndThumbnailGenerator.ts   # Payload generation
└── md5/                               # MD5 hashing implementation
```

---

## API Reference

### AesEncrypt

#### encrypt()

```typescript
async encrypt(
  data: Uint8Array,
  key: Uint8Array,
  iv?: Uint8Array
): Promise<{ encryptedData: Uint8Array; iv: Uint8Array }>;
```

Encrypts data using AES-CBC.

**Parameters**:
- `data`: Data to encrypt
- `key`: 32-byte encryption key
- `iv`: 16-byte initialization vector (generated if not provided)

**Example**:
```typescript
import { encrypt } from '@homebase-id/js-lib/helpers';
import { stringToUint8Array } from '@homebase-id/js-lib/helpers';

const data = stringToUint8Array('Secret message');
const key = crypto.getRandomValues(new Uint8Array(32));

const { encryptedData, iv } = await encrypt(data, key);
```

---

#### decrypt()

```typescript
async decrypt(
  encryptedData: Uint8Array,
  key: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array>;
```

Decrypts AES-CBC encrypted data.

---

### DataUtil

#### stringToUint8Array()

```typescript
stringToUint8Array(str: string): Uint8Array;
```

Converts string to Uint8Array (UTF-8 encoding).

**Example**:
```typescript
import { stringToUint8Array } from '@homebase-id/js-lib/helpers';

const bytes = stringToUint8Array('Hello World');
```

---

#### uint8ArrayToString()

```typescript
uint8ArrayToString(array: Uint8Array): string;
```

Converts Uint8Array to string (UTF-8 decoding).

---

#### base64ToUint8Array()

```typescript
base64ToUint8Array(base64: string): Uint8Array;
```

Decodes base64 string to Uint8Array.

---

#### uint8ArrayToBase64()

```typescript
uint8ArrayToBase64(array: Uint8Array): string;
```

Encodes Uint8Array to base64 string.

---

#### jsonStringify64()

```typescript
jsonStringify64<T>(obj: T): string;
```

JSON stringify and base64 encode in one step.

**Example**:
```typescript
import { jsonStringify64 } from '@homebase-id/js-lib/helpers';

const encoded = jsonStringify64({ message: 'Hello', count: 42 });
```

---

#### tryJsonParse()

```typescript
tryJsonParse<T>(str: string): T | null;
```

Safely parse JSON, returning null on error.

---

### HashUtil

#### sha256()

```typescript
async sha256(data: Uint8Array): Promise<Uint8Array>;
```

Computes SHA-256 hash.

**Example**:
```typescript
import { sha256, stringToUint8Array } from '@homebase-id/js-lib/helpers';

const data = stringToUint8Array('Hash this');
const hash = await sha256(data);
```

---

#### md5()

```typescript
md5(data: Uint8Array): string;
```

Computes MD5 hash (returns hex string).

---

### BrowserUtil

#### hasDebugFlag()

```typescript
hasDebugFlag(): boolean;
```

Checks if debug mode is enabled.

---

#### isLocalStorageAvailable()

```typescript
isLocalStorageAvailable(): boolean;
```

Checks if localStorage is accessible.

---

#### isTouchDevice()

```typescript
isTouchDevice(): boolean;
```

Detects if device supports touch.

---

#### getBrowserName()

```typescript
getBrowserName(): string;
```

Returns browser name ('chrome', 'firefox', 'safari', etc.).

---

### DomainUtil

#### parseDomain()

```typescript
parseDomain(url: string): string;
```

Extracts domain from URL.

**Example**:
```typescript
import { parseDomain } from '@homebase-id/js-lib/helpers';

const domain = parseDomain('https://alice.dotyou.cloud/page');
// Returns: 'alice.dotyou.cloud'
```

---

#### isValidDomain()

```typescript
isValidDomain(domain: string): boolean;
```

Validates domain format.

---

### AttributeHelpers

#### getAttribute()

```typescript
getAttribute<T>(
  attributes: AttributeMap,
  key: string
): T | undefined;
```

Gets typed attribute value.

---

#### setAttribute()

```typescript
setAttribute<T>(
  attributes: AttributeMap,
  key: string,
  value: T
): AttributeMap;
```

Sets attribute value (immutable update).

---

### PermissionHelpers

#### hasPermission()

```typescript
hasPermission(
  permissions: number,
  requiredPermission: PermissionType
): boolean;
```

Checks if permission flags include required permission.

**Example**:
```typescript
import { hasPermission, PermissionType } from '@homebase-id/js-lib/helpers';

const userPerms = PermissionType.Read | PermissionType.Write;
const canWrite = hasPermission(userPerms, PermissionType.Write);
// Returns: true
```

---

#### formatPermissions()

```typescript
formatPermissions(permissions: number): string[];
```

Converts permission number to array of permission names.

---

### BlobHelpers

#### blobToUint8Array()

```typescript
async blobToUint8Array(blob: Blob): Promise<Uint8Array>;
```

Converts Blob to Uint8Array.

---

#### uint8ArrayToBlob()

```typescript
uint8ArrayToBlob(
  data: Uint8Array,
  mimeType: string
): Blob;
```

Converts Uint8Array to Blob.

---

### ImageMerger

#### mergeImages()

```typescript
async mergeImages(
  images: (string | Blob)[],
  options?: {
    width?: number;
    height?: number;
    layout?: 'grid' | 'horizontal' | 'vertical';
  }
): Promise<Blob>;
```

Merges multiple images into one.

**Example**:
```typescript
import { mergeImages } from '@homebase-id/js-lib/helpers';

const merged = await mergeImages(
  [imageBlob1, imageBlob2, imageBlob3],
  { layout: 'grid', width: 600, height: 600 }
);
```

---

### PayloadAndThumbnailGenerator

#### generatePayloadAndThumbnails()

```typescript
async generatePayloadAndThumbnails(
  file: File,
  options?: {
    thumbnailSizes?: number[];
    maxPayloadSize?: number;
  }
): Promise<{
  payload: PayloadDescriptor;
  thumbnails: ThumbnailDescriptor[];
}>;
```

Generates payload and thumbnails from file.

**Example**:
```typescript
import { generatePayloadAndThumbnails } from '@homebase-id/js-lib/helpers';

const { payload, thumbnails } = await generatePayloadAndThumbnails(
  imageFile,
  { thumbnailSizes: [200, 400, 800] }
);
```

---

## Common Patterns

### Pattern 1: Encrypt and Store Data

```typescript
import { 
  encrypt, 
  decrypt, 
  stringToUint8Array, 
  uint8ArrayToString 
} from '@homebase-id/js-lib/helpers';

// Encrypt
const message = 'Secret data';
const data = stringToUint8Array(message);
const key = crypto.getRandomValues(new Uint8Array(32));

const { encryptedData, iv } = await encrypt(data, key);

// Store encrypted data and IV
localStorage.setItem('data', uint8ArrayToBase64(encryptedData));
localStorage.setItem('iv', uint8ArrayToBase64(iv));

// Later: Decrypt
const storedData = base64ToUint8Array(localStorage.getItem('data')!);
const storedIv = base64ToUint8Array(localStorage.getItem('iv')!);

const decrypted = await decrypt(storedData, key, storedIv);
const originalMessage = uint8ArrayToString(decrypted);
```

---

### Pattern 2: Permission Checking

```typescript
import { hasPermission, PermissionType } from '@homebase-id/js-lib/helpers';

function checkFileAccess(userPermissions: number) {
  const canRead = hasPermission(userPermissions, PermissionType.Read);
  const canWrite = hasPermission(userPermissions, PermissionType.Write);
  const canDelete = hasPermission(userPermissions, PermissionType.Delete);
  
  return { canRead, canWrite, canDelete };
}
```

---

### Pattern 3: Safe JSON Parsing

```typescript
import { tryJsonParse } from '@homebase-id/js-lib/helpers';

const data = tryJsonParse<MyType>(jsonString);

if (data) {
  // Valid JSON
  processData(data);
} else {
  // Invalid JSON
  console.error('Failed to parse JSON');
}
```

---

## Best Practices

### ✅ DO:

1. **Use type-safe conversions**
   ```typescript
   const data = tryJsonParse<ExpectedType>(json);
   ```

2. **Handle encryption IV properly**
   ```typescript
   const { encryptedData, iv } = await encrypt(data, key);
   // Store both encrypted data and IV
   ```

3. **Check browser capabilities**
   ```typescript
   if (isLocalStorageAvailable()) {
     localStorage.setItem('key', 'value');
   }
   ```

### ❌ DON'T:

1. **Don't ignore encryption failures**
   ```typescript
   // Bad: no error handling
   const decrypted = await decrypt(data, key, iv);
   
   // Good: with error handling
   try {
     const decrypted = await decrypt(data, key, iv);
   } catch (error) {
     console.error('Decryption failed');
   }
   ```

---

## Related Documentation

- [CORE_MODULE.md](./CORE_MODULE.md) - Uses helpers for encryption
- [AUTH_MODULE.md](./AUTH_MODULE.md) - Uses helpers for key derivation

---

**Last Updated**: October 31, 2025  
**Module Path**: `packages/libs/js-lib/src/helpers/`
