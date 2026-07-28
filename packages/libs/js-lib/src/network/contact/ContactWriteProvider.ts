import { AxiosError } from 'axios';
import { DotYouClient } from '../../core/DotYouClient';
import { decryptKeyHeader } from '../../core/DriveData/SecurityHelpers';
import { cbcEncrypt } from '../../helpers/AesEncrypt';
import {
  base64ToUint8Array,
  getRandom16ByteArray,
  uint8ArrayToBase64,
} from '../../helpers/DataUtil';
import { createThumbnails } from '../../media/Thumbs/ThumbnailProvider';
import { ContactDataImage, ContactFile } from './ContactTypes';
import { CONTACT_PROFILE_IMAGE_KEY, getContactByUniqueId } from './ContactManager';

const CONTACTS_ROOT = '/contacts';

/**
 * Server response for a contact write. The server addresses contacts by their deterministic uniqueId
 * (md5(odinId)); it does NOT return a fileId — read the file back by uniqueId if you need one.
 */
export interface ContactWriteResponse {
  uniqueId: string;
  versionTag: string;
}

/** 409 body: the current version tag (+ header) the caller should reconcile against. */
export interface ContactWriteConflict {
  versionTag: string;
}

/**
 * Create a contact through the appData-preserving server merge (`POST /contacts`). Throws with a 409
 * response when a contact for this odinId already exists — reconcile with {@link updateContact} using
 * the returned {@link ContactWriteConflict.versionTag}.
 *
 * The `content` carries contact fields ONLY — never the per-app `appData` map (the server owns and
 * preserves it) and never the image (use {@link setContactImage}).
 */
export const createContact = async (
  dotYouClient: DotYouClient,
  content: ContactFile
): Promise<ContactWriteResponse> => {
  const client = dotYouClient.createAxiosClient();
  return client.post<ContactWriteResponse>(CONTACTS_ROOT, { content }).then((response) => response.data);
};

/**
 * Update a contact in place through the server merge (`PUT /contacts/{uniqueId}`). Fields left empty are
 * left alone (they are not cleared), and the per-app `appData` map is preserved untouched — so a client
 * that knows nothing about `appData` can never wipe it. Version-tag gated: a stale tag throws a 409.
 */
export const updateContact = async (
  dotYouClient: DotYouClient,
  uniqueId: string,
  versionTag: string,
  content: ContactFile
): Promise<ContactWriteResponse> => {
  const client = dotYouClient.createAxiosClient();
  return client
    .put<ContactWriteResponse>(`${CONTACTS_ROOT}/${uniqueId}`, { versionTag, content })
    .then((response) => response.data);
};

/**
 * Update with automatic reconciliation on a version race: on a 409 it re-reads the current version tag
 * from the drive and retries (bounded). A concurrent enrichment/app-data/other-device write is thereby
 * absorbed rather than surfaced as an error.
 */
export const updateContactWithRetry = async (
  dotYouClient: DotYouClient,
  uniqueId: string,
  versionTag: string,
  content: ContactFile,
  maxAttempts = 3
): Promise<ContactWriteResponse> => {
  let tag = versionTag;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await updateContact(dotYouClient, uniqueId, tag, content);
    } catch (ex) {
      const status = (ex as AxiosError)?.response?.status;
      if (status !== 409 || attempt === maxAttempts) throw ex;
      const current = await getContactByUniqueId(dotYouClient, uniqueId);
      if (!current?.fileMetadata.versionTag) throw ex;
      tag = current.fileMetadata.versionTag;
    }
  }
  // Unreachable: the loop either returns or throws.
  throw new Error(`Failed to update contact ${uniqueId} after ${maxAttempts} attempts`);
};

/** Enrich a contact from the peer's profile (`POST /contacts/sync/{odinId}`); best-effort, appData-safe. */
export const syncContact = async (dotYouClient: DotYouClient, odinId: string): Promise<void> => {
  const client = dotYouClient.createAxiosClient();
  await client.post(`${CONTACTS_ROOT}/sync/${odinId}`);
};

/** Soft-delete a contact (`DELETE /contacts/{uniqueId}`). */
export const deleteContact = async (dotYouClient: DotYouClient, uniqueId: string): Promise<void> => {
  const client = dotYouClient.createAxiosClient();
  await client.delete(`${CONTACTS_ROOT}/${uniqueId}`);
};

/**
 * Set (or replace) a contact's profile image via `PUT /contacts/{uniqueId}/image`. The endpoint stores
 * ciphertext verbatim, so the image and every thumbnail are encrypted here — client-side — under the
 * contact file's own AES key with a single fresh IV (the server records that one IV for all of them).
 * The current version tag is read from the drive, so this is safe to call right after a create/update.
 */
export const setContactImage = async (
  dotYouClient: DotYouClient,
  uniqueId: string,
  image: ContactDataImage
): Promise<ContactWriteResponse> => {
  // Re-read the stored contact to get its file key + current version tag.
  const header = await getContactByUniqueId(dotYouClient, uniqueId);
  if (!header) throw new Error(`Cannot set image: contact ${uniqueId} not found`);
  if (!header.sharedSecretEncryptedKeyHeader) throw new Error(`Contact ${uniqueId} has no key header`);

  const keyHeader = await decryptKeyHeader(dotYouClient, header.sharedSecretEncryptedKeyHeader);

  const imageBytes = base64ToUint8Array(image.content);
  const imageBlob = new Blob([imageBytes], { type: image.contentType });

  // One IV shared by the image and all thumbnails (matches the server's storage model).
  const iv = getRandom16ByteArray();

  const { additionalThumbnails } = await createThumbnails(imageBlob, CONTACT_PROFILE_IMAGE_KEY);

  const encryptedImage = await cbcEncrypt(imageBytes, iv, keyHeader.aesKey);
  const thumbnails = await Promise.all(
    additionalThumbnails.map(async (thumb) => {
      const bytes = new Uint8Array(await thumb.payload.arrayBuffer());
      return {
        pixelWidth: thumb.pixelWidth,
        pixelHeight: thumb.pixelHeight,
        contentType: thumb.payload.type,
        content: uint8ArrayToBase64(await cbcEncrypt(bytes, iv, keyHeader.aesKey)),
      };
    })
  );

  const client = dotYouClient.createAxiosClient();
  return client
    .put<ContactWriteResponse>(`${CONTACTS_ROOT}/${uniqueId}/image`, {
      versionTag: header.fileMetadata.versionTag,
      contentType: image.contentType,
      iv: uint8ArrayToBase64(iv),
      content: uint8ArrayToBase64(encryptedImage),
      thumbnails,
    })
    .then((response) => response.data);
};

/** Remove a contact's profile image (`DELETE /contacts/{uniqueId}/image`). */
export const deleteContactImage = async (
  dotYouClient: DotYouClient,
  uniqueId: string,
  versionTag: string
): Promise<ContactWriteResponse> => {
  const client = dotYouClient.createAxiosClient();
  return client
    .delete<ContactWriteResponse>(`${CONTACTS_ROOT}/${uniqueId}/image`, { params: { versionTag } })
    .then((response) => response.data);
};
