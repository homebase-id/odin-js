import { ApiType, DotYouClient, NewHomebaseFile } from '@homebase-id/js-lib/core';
import {
  RawContact,
  getContactByUniqueId,
  getContactByOdinId,
  ContactWriteResponse,
  ContactWriteConflict,
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
      // A create that collides on the deterministic uniqueId (409) means it already exists — update it
      // over the returned current version tag instead.
      const response = (ex as AxiosError<ContactWriteConflict>)?.response;
      if (response?.status !== 409 || !response.data?.versionTag) throw ex;
      result = await updateContactWithRetry(dotYouClient, uniqueId, response.data.versionTag, content);
    }
  }

  // Persist the profile image (if any) via its dedicated, version-gated endpoint.
  if (image?.content) {
    result = await setContactImage(dotYouClient, uniqueId, image);
  }

  return result;
};
