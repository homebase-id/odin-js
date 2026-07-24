import { ApiType, DotYouClient, NewHomebaseFile } from '@homebase-id/js-lib/core';
import {
  RawContact,
  getContactByUniqueId,
  getContactByOdinId,
  ContactWriteResponse,
  createContact,
  updateContactWithRetry,
  setContactImage,
} from '@homebase-id/js-lib/network';
import { toGuidId } from '@homebase-id/js-lib/helpers';
import { AxiosError } from 'axios';

//Handles management of Contacts
//
// All contact writes go through the server-side contact API (create/update), NOT a direct drive write.
// That matters: the server merge preserves the per-app `appData` map (e.g. another app's flags) that
// rides inline in the contact content. A direct drive upload would replace the content wholesale and
// silently wipe those slots — this client never sends `appData`, and it must not need to.
export const saveContact = async (
  dotYouClient: DotYouClient,
  contact: NewHomebaseFile<RawContact>
): Promise<ContactWriteResponse | void> => {
  // Only the owner console and app clients can write contacts; guests have no write endpoint.
  const apiType = dotYouClient.getType();
  if (apiType !== ApiType.Owner && apiType !== ApiType.App) {
    console.warn('[common-app:saveContact] ignored write in non-writable context', apiType);
    return;
  }

  // The image is stored via a dedicated endpoint (encrypted under the file key), not in the content.
  const { image, ...content } = contact.fileMetadata.appData.content;
  // Defensive: never forward the server-owned per-app `appData` map, even if a prior read left it on
  // the object at runtime (the type has no such field). The server ignores it on update, but not
  // sending it keeps the intent unambiguous.
  delete (content as Record<string, unknown>).appData;
  const odinId = content.odinId;

  // The server keys contacts on md5(odinId); match it so create/update land on the same file.
  const uniqueId = odinId ? toGuidId(odinId) : contact.fileMetadata.appData.uniqueId;
  if (!uniqueId) throw new Error('a contact needs an odinId or a uniqueId to be saved');

  // Decide create vs update from the current stored version (no fileId needed — the API is keyed by
  // uniqueId). NOTE: `content` deliberately carries no `appData`; the server preserves the stored slot.
  const existing = odinId
    ? await getContactByOdinId(dotYouClient, odinId)
    : await getContactByUniqueId(dotYouClient, uniqueId);

  let result: ContactWriteResponse;
  if (existing?.fileMetadata.versionTag) {
    result = await updateContactWithRetry(
      dotYouClient,
      uniqueId,
      existing.fileMetadata.versionTag,
      content
    );
  } else {
    try {
      result = await createContact(dotYouClient, content);
    } catch (ex) {
      // A create that collides on the deterministic uniqueId (409) means the contact already exists
      // (a race, or our existence read missed it). Reconcile by re-reading the current version and
      // updating. NOTE: the client does not decrypt error-response bodies, so the version must come
      // from a fresh GET — not from the 409 payload.
      if ((ex as AxiosError)?.response?.status !== 409) throw ex;
      const current = await getContactByUniqueId(dotYouClient, uniqueId);
      if (!current?.fileMetadata.versionTag) throw ex;
      result = await updateContactWithRetry(dotYouClient, uniqueId, current.fileMetadata.versionTag, content);
    }
  }

  // Persist the profile image (if any) via its dedicated, version-gated endpoint.
  if (image?.content) {
    result = await setContactImage(dotYouClient, uniqueId, image);
  }

  return result;
};
