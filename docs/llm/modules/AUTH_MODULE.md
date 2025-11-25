# AUTH Module Documentation

## Overview
The AUTH module (`@homebase-id/js-lib/auth`) provides authentication, cryptography, and identity management for Homebase applications. It implements the YouAuth protocol for secure authentication and provides ECC/RSA key management.

**All functions and types documented below are verified exports from the actual source code.**

---

## Authentication Provider

### `hasValidToken(dotYouClient)`
Verifies if the current authentication token is valid
- **dotYouClient**: `DotYouClient`
- **Returns**: `Promise<boolean | null>`
- Calls `/auth/verifytoken` endpoint

### `parseDriveAccessRequest(driveAccessRequest)`
Converts TargetDriveAccessRequest to AppDriveAuthorizationParams
- **driveAccessRequest**: `TargetDriveAccessRequest`
- **Returns**: `AppDriveAuthorizationParams`

### `getRegistrationParams(identity, appId, appName, circleDef?, returnUrl?, drives?, permissionSet?, corsHostNames?, link?)`
Creates YouAuth registration parameters with ECC public key
- **identity**: `string` - User's Homebase identity
- **appId**: `string` - Application ID
- **appName**: `string` - Application name
- **circleDef**: Circle definition
- **returnUrl**: `string` - Return URL after auth
- **drives**: Drive access requests
- **permissionSet**: Permission set
- **corsHostNames**: `string[]` - CORS allowed hosts
- **link**: External link
- **Returns**: `Promise<YouAuthorizationParams>`

### `getExtendAppRegistrationParams(identity, appId, newDrives)`
Extends app registration with new drive permissions
- **identity**: `string`
- **appId**: `string`
- **newDrives**: `TargetDriveAccessRequest[]`
- **Returns**: `AppDriveAuthorizationParams`

### `exchangeDigestForToken(identity, publicKey, salt)`
Exchanges digest for authentication token
- **identity**: `string`
- **publicKey**: `string`
- **salt**: `string`
- **Returns**: `Promise<string>` - Auth token

### `finalizeAuthentication(identity, publicKey, salt, returnUrl)`
Finalizes authentication process
- **identity**: `string`
- **publicKey**: `string`
- **salt**: `string`
- **returnUrl**: `string`
- **Returns**: `Promise<{ dotYouClient: DotYouClient; identity: string }>`

### `logout(dotYouClient)`
Logs out the current user
- **dotYouClient**: `DotYouClient`
- **Returns**: `Promise<void>`

### `preAuth(dotYouClient)`
Pre-authentication check
- **dotYouClient**: `DotYouClient`
- **Returns**: `Promise<void>`

**Type Exports**: `YouAuthorizationParams`, `AppAuthorizationParams`, `AppDriveAuthorizationParams`, `TargetDriveAccessRequest`

---

## ECC Key Provider

### `createEccPair()`
Generates a new ECDH P-384 key pair
- **Returns**: `Promise<CryptoKeyPair>`
- **Algorithm**: ECDH with P-384 curve

### `getEccSharedSecret(privateKey, remotePublicKey, salt)`
Derives shared secret using ECDH + HKDF
- **privateKey**: `CryptoKey` - Local private key
- **remotePublicKey**: `CryptoKey` - Remote public key
- **salt**: `Uint8Array` - Salt for derivation
- **Returns**: `Promise<Uint8Array>` - 128-bit AES-CBC key
- **Process**: ECDH → deriveBits → HKDF (SHA-256) → AES-CBC key

### `importRemotePublicEccKey(publicKey)`
Imports remote public ECC key from base64 JWK
- **publicKey**: `string` - Base64-encoded JWK
- **Returns**: `Promise<CryptoKey>`

### `saveEccKey(keyPair)`
Saves ECC key pair to localStorage
- **keyPair**: `CryptoKeyPair`
- **Returns**: `Promise<void>`
- **Storage**: Exports to pkcs8 format, stores in localStorage with key 'ecc-pk'

### `retrieveEccKey()`
Retrieves ECC key pair from localStorage
- **Returns**: `Promise<CryptoKeyPair | null>`
- **Storage**: Imports from pkcs8 format

### `exportEccPublicKey(publicKey)`
Exports public key to JWK string
- **publicKey**: `CryptoKey`
- **Returns**: `Promise<string>` - JWK as string

### `throwAwayTheECCKey()`
Removes ECC key from localStorage
- **Returns**: `void`

### `aesGcmEncryptWithEccSharedSecret(data, sharedSecret, iv?)`
Encrypts data with AES-GCM using ECC shared secret
- **data**: `string` - Data to encrypt
- **sharedSecret**: `Uint8Array` - Shared secret
- **iv**: `Uint8Array` - Optional IV
- **Returns**: `Promise<{ encryptedData: string; iv: string }>`

---

## RSA Key Provider

### `createRsaPair()`
Generates a new RSA-OAEP 2048-bit key pair
- **Returns**: `Promise<CryptoKeyPair>`
- **Algorithm**: RSA-OAEP with SHA-256

### `decryptWithRsaKey(encrypted, key)`
Decrypts RSA-encrypted data
- **encrypted**: `string` - Base64-encoded encrypted data
- **key**: `CryptoKey` - RSA private key
- **Returns**: `Promise<string>` - Decrypted string

### `saveRsaKey(keyPair)`
Saves RSA key pair to localStorage
- **keyPair**: `CryptoKeyPair`
- **Returns**: `Promise<void>`

### `retrieveRsaKey()`
Retrieves RSA key pair from localStorage
- **Returns**: `Promise<CryptoKeyPair | null>`

### `throwAwayTheRsaKey()`
Removes RSA key from localStorage
- **Returns**: `void`

---

## Identity Provider

### `saveIdentity(identity)`
Saves user identity to localStorage
- **identity**: `string`
- **Returns**: `void`

### `retrieveIdentity()`
Retrieves user identity from localStorage
- **Returns**: `string | null`

---

## Browser Info Helpers

### `getOperatingSystem(userAgentVal?)`
Detects operating system from user agent
- **userAgentVal**: `string` - Optional user agent string
- **Returns**: `string` - OS name (Windows, Mac, Linux, Android, iOS, etc.)

### `getBrowser(userAgentVal?)`
Detects browser from user agent
- **userAgentVal**: `string` - Optional user agent string
- **Returns**: `string` - Browser name (Chrome, Firefox, Safari, Edge, etc.)

---

## Summary

The AUTH module provides:
- **YouAuth Protocol**: Complete authentication flow implementation
- **ECC Cryptography**: P-384 ECDH key exchange, shared secret derivation
- **RSA Cryptography**: RSA-OAEP 2048-bit encryption/decryption
- **Identity Management**: localStorage-based identity storage
- **Browser Detection**: OS and browser identification

All exports are verified from actual source code in `packages/libs/js-lib/src/auth/`.
