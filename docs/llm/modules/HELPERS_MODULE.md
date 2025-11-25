# HELPERS Module Documentation

## Overview
The HELPERS module (`@homebase-id/js-lib/helpers`) provides utility functions for data transformation, encryption, permissions, browser detection, and media processing.

**All functions and types documented below are verified exports from the actual source code.**

---

## Data Utilities

### `stringToUint8Array(str)`
Converts string to Uint8Array using TextEncoder
- **str**: `string`
- **Returns**: `Uint8Array`

### `base64ToUint8Array(base64)`
Converts base64 string to Uint8Array
- **base64**: `string`
- **Returns**: `Uint8Array`

### `uint8ArrayToBase64(buffer)`
Converts Uint8Array to base64 string
- **buffer**: `Uint8Array`
- **Returns**: `string`

### `jsonStringify64(obj)`
Stringify JSON with base64 encoding for byte arrays
- **obj**: `unknown`
- **Returns**: `string`

### `byteArrayToString(bytes)`
Converts byte array to string using TextDecoder
- **bytes**: `Uint8Array`
- **Returns**: `string`

### `byteArrayToNumber(byteArray)`
Converts byte array to number
- **byteArray**: `Uint8Array`
- **Returns**: `number`

### `getNewId()`
Generates new GUID using Guid.create()
- **Returns**: `string`

### `formatGuidId(guid)`
Removes dashes from GUID
- **guid**: `string`
- **Returns**: `string`

### `toGuidId(input)`
Converts string to GUID format
- **input**: `string`
- **Returns**: `string`

### `isAGuidId(input)`
Checks if string is a valid GUID
- **input**: `string`
- **Returns**: `boolean`

### `stringGuidsEqual(a?, b?)`
Compares two GUIDs for equality
- **a**: `string`
- **b**: `string`
- **Returns**: `boolean`

### `drivesEqual(a?, b?)`
Compares two TargetDrive objects
- **a**: `TargetDrive`
- **b**: `TargetDrive`
- **Returns**: `boolean`

### `aclEqual(a, b)`
Compares two AccessControlList objects
- **a**: `AccessControlList`
- **b**: `AccessControlList`
- **Returns**: `boolean`

### `compareAcl(currentAcl, newAcl)`
Compares ACLs and returns differences
- **currentAcl**: `AccessControlList`
- **newAcl**: `AccessControlList`
- **Returns**: Comparison result object

### `assertIfDefined(key, value)`
Throws error if value is undefined
- **key**: `string`
- **value**: `unknown`
- **Throws**: Error if value is undefined

### `assertIfDefinedAndNotDefault(key, value)`
Throws error if value is undefined or empty
- **key**: `string`
- **value**: `unknown`
- **Throws**: Error if value is undefined/empty

### `getRandom16ByteArray()`
Generates random 16-byte array using crypto.getRandomValues
- **Returns**: `Uint8Array`

### `splitSharedSecretEncryptedKeyHeader(keyHeader)`
Splits encrypted key header into components
- **keyHeader**: `KeyHeader`
- **Returns**: Split components

### `mergeByteArrays(chunks)`
Merges multiple byte arrays into one
- **chunks**: `Uint8Array[]`
- **Returns**: `Uint8Array`

### `roundToSmallerMultipleOf16(x)`
Rounds down to nearest multiple of 16
- **x**: `number`
- **Returns**: `number`

### `roundToLargerMultipleOf16(x)`
Rounds up to nearest multiple of 16
- **x**: `number`
- **Returns**: `number`

### `stringifyToQueryParams(obj)`
Converts object to query string
- **obj**: `Record<string, unknown>`
- **Returns**: `string`

### `stringifyArrayToQueryParams(arr)`
Converts array to query string
- **arr**: `Record<string, unknown>[]`
- **Returns**: `string`

### `getQueryBatchCursorFromTime(fromUnixTimeInMs, toUnixTimeInMs?)`
Generates batch query cursor from timestamps
- **fromUnixTimeInMs**: `number`
- **toUnixTimeInMs**: `number`
- **Returns**: Cursor string

### `getQueryModifiedCursorFromTime(unixTimeInMs)`
Generates modified query cursor from timestamp
- **unixTimeInMs**: `number`
- **Returns**: Cursor string

### `tryJsonParse<T>(json, onError?)`
Safely parses JSON with error handling
- **json**: `string`
- **onError**: `(ex: unknown) => void`
- **Returns**: `T`

### `getDataUriFromBlob(blob)`
Converts blob to data URI
- **blob**: `Blob`
- **Returns**: `Promise<string>`

### `getBlobFromBytes({ bytes, type })`
Creates blob from byte array
- **bytes**: `Uint8Array`
- **type**: `string`
- **Returns**: `Blob`

### `getLargestThumbOfPayload(payload?)`
Gets largest thumbnail from payload
- **payload**: `PayloadDescriptor`
- **Returns**: `ThumbnailFile | undefined`

### `hashGuidId(input, salt?)`
Hashes GUID with optional salt
- **input**: `string`
- **salt**: `string`
- **Returns**: `Promise<string>`

---

## AES Encryption

### `cbcEncrypt(data, key, iv)`
Encrypts data using AES-CBC
- **data**: `Uint8Array`
- **key**: `Uint8Array`
- **iv**: `Uint8Array`
- **Returns**: `Promise<Uint8Array>`

### `cbcDecrypt(data, key, iv)`
Decrypts data using AES-CBC
- **data**: `Uint8Array`
- **key**: `Uint8Array`
- **iv**: `Uint8Array`
- **Returns**: `Promise<Uint8Array>`

### `streamEncryptWithCbc(stream, key, iv)`
Encrypts stream using AES-CBC
- **stream**: `ReadableStream<Uint8Array>`
- **key**: `Uint8Array`
- **iv**: `Uint8Array`
- **Returns**: `Promise<ReadableStream<Uint8Array>>`

### `streamDecryptWithCbc(stream, key, iv)`
Decrypts stream using AES-CBC
- **stream**: `ReadableStream<Uint8Array>`
- **key**: `Uint8Array`
- **iv**: `Uint8Array`
- **Returns**: `Promise<ReadableStream<Uint8Array>>`

---

## Hash Utilities

### `getNewXorId(a, b)`
Generates XOR ID from two strings
- **a**: `string`
- **b**: `string`
- **Returns**: `Promise<string>`

---

## Blob Helpers

### `streamToByteArray(stream, mimeType)`
Converts stream to byte array
- **stream**: `ReadableStream<Uint8Array>`
- **mimeType**: `string`
- **Returns**: `Promise<Uint8Array>`

### `getSecuredBlob(bytes, key, iv, mimeType?)`
Creates encrypted blob
- **bytes**: `Uint8Array`
- **key**: `Uint8Array`
- **iv**: `Uint8Array`
- **mimeType**: `string`
- **Returns**: `Promise<Blob>`

---

## Browser Utilities

### `isLocalStorageAvailable()`
Checks if localStorage is available
- **Returns**: `boolean`

### `isTouchDevice()`
Checks if device supports touch
- **Returns**: `boolean`

### `hasDebugFlag()`
Checks for debug flag in URL
- **Returns**: `boolean`

---

## Domain Utilities

### `getDomainFromUrl(url?)`
Extracts domain from URL
- **url**: `string`
- **Returns**: `string | undefined`

### `getHostFromUrl(url?)`
Extracts host from URL
- **url**: `string`
- **Returns**: `string | undefined`

### `getTwoLettersFromDomain(domain)`
Gets two-letter identifier from domain
- **domain**: `string`
- **Returns**: `string`

---

## Permission Helpers

### `getDrivePermissionFromNumber(value?)`
Converts number to DrivePermissionType array
- **value**: `number[]`
- **Returns**: `DrivePermissionType[]`

### `getAppPermissionFromNumber(value)`
Converts number to AppPermissionType
- **value**: `number`
- **Returns**: `AppPermissionType`

### `getDrivePermissionFromString(permission)`
Converts string to DrivePermissionType array
- **permission**: `unknown`
- **Returns**: `DrivePermissionType[]`

### `getUniqueDrivesWithHighestPermission(grants)`
Gets unique drives with highest permission
- **grants**: `DriveGrant[]`
- **Returns**: Filtered drive grants

### `getPermissionNumberFromDrivePermission(permission)`
Converts DrivePermissionType to number
- **permission**: `PermissionedDrive`
- **Returns**: `number`

---

## Attribute Helpers

### `slugify(text)`
Converts text to URL slug
- **text**: `string`
- **Returns**: `string`

### `makeSlug(post)`
Generates slug from post
- **post**: `HomebaseFile<PostContent> | NewHomebaseFile<PostContent>`
- **Returns**: `string`

### `generateDisplayLocation(city?, region?, country?)`
Generates display location string
- **city**: `string`
- **region**: `string`
- **country**: `string`
- **Returns**: `string`

### `getDisplayLocationFromLocationAttribute(attr)`
Gets display location from attribute
- **attr**: `Attribute`
- **Returns**: `string`

### `generateDisplayName(first, last)`
Generates display name from first/last name
- **first**: `string`
- **last**: `string`
- **Returns**: `string`

### `getDisplayNameOfNameAttribute(attr)`
Gets display name from name attribute
- **attr**: `Attribute`
- **Returns**: `string`

### `getInitialsOfNameAttribute(attr)`
Gets initials from name attribute
- **attr**: `Attribute`
- **Returns**: `string`

---

## Media Helpers

### `makeGrid(thumbs)`
Creates grid from thumbnails
- **thumbs**: `EmbeddedThumb[]`
- **Returns**: `Promise<Canvas>`

### `getPayloadsAndThumbnailsForNewMedia(files, targetDrive, encrypt?)`
Processes media files for upload
- **files**: `File[]`
- **targetDrive**: `TargetDrive`
- **encrypt**: `boolean`
- **Returns**: `Promise<{ payloads, thumbnails }>`

---

## Video Segmenter

All exports from `Video/VideoSegmenter.ts` including:
- `getMp4Info(file)` - Gets MP4 file information
- `getCodecFromMp4Info(info)` - Extracts codec from MP4 info
- `segmentVideoFile(...)` - Segments video file

---

## Summary

The HELPERS module provides:
- **Data Conversion**: String/bytes/base64 conversions
- **GUID Management**: Generation, formatting, comparison
- **Encryption**: AES-CBC encryption/decryption for data and streams
- **Browser Detection**: Feature detection and environment checks
- **Permission Conversion**: Permission type conversions
- **Attribute Helpers**: Slug generation, name/location formatting
- **Media Processing**: Grid creation, media preparation
- **Utilities**: Query params, parsing, hashing

All exports are verified from actual source code in `packages/libs/js-lib/src/helpers/`.
