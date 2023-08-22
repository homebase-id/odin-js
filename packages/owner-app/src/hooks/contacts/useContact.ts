import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toGuidId } from '@youfoundation/js-lib/helpers';
import { getContactByUniqueId, saveContact } from '../../provider/contact/ContactProvider';
import {
  fetchConnectionInfo,
  fetchDataFromPublic,
  fetchPendingInfo,
} from '../../provider/contact/ContactSourceProvider';
import { ContactFile, ContactVm, RawContact } from '../../provider/contact/ContactTypes';
import useAuth from '../auth/useAuth';

const useContact = ({
  odinId,
  id,
  loadPicture,
}: {
  odinId?: string;
  id?: string;
  loadPicture?: boolean;
}) => {
  const dotYouClient = useAuth().getDotYouClient();
  const queryClient = useQueryClient();

  const fetchSingle = async ({
    odinId,
    id,
    loadPicture,
  }: {
    odinId: string;
    id: string;
    loadPicture?: boolean;
  }): Promise<ContactVm | undefined> => {
    if (!odinId) {
      if (!id) {
        return;
      }

      //Direct fetch with id:
      const directContact = await getContactByUniqueId(dotYouClient, id);
      return directContact;
    }

    // Direct fetch with odinId:
    const contactBookContact = await getContactByUniqueId(dotYouClient, toGuidId(odinId));
    if (contactBookContact) {
      return contactBookContact;
    }

    // If no contact in the contact book:
    // Get contact data from connection single:
    const connectionInfo = await fetchConnectionInfo(dotYouClient, odinId);
    if (connectionInfo) {
      // => And automatically push into the Contact
      const connectionContact = await saveContact(dotYouClient, {
        ...connectionInfo,
        odinId: odinId,
      });

      return parseContact(connectionContact);
    }

    console.debug(
      `Contact book and connection detail is empty for ${odinId}, gone hunting for best fallback`
    );

    let returnContact;

    // Else fallback to:
    // Get contact data from pending single:
    if (!returnContact) {
      const pendingInfo =
        (await fetchPendingInfo(dotYouClient, odinId, loadPicture || false)) ?? undefined;
      returnContact = pendingInfo ? { ...pendingInfo } : returnContact;
    }

    // Get contact data from public.json
    if (!returnContact) {
      const publicContact = await fetchDataFromPublic(odinId, loadPicture || false);
      returnContact = publicContact ? { ...publicContact } : returnContact;
    }

    if (returnContact) {
      // Don't save contacts if we weren't allowed to fetch images
      if (loadPicture) {
        // => And automatically push into the Contact
        const savedReturnedContact = await saveContact(dotYouClient, {
          ...returnContact,
          odinId: odinId,
        });

        return parseContact(savedReturnedContact);
      } else {
        return parseContact(returnContact);
      }
    }

    return undefined;
  };

  const refresh = async ({ contact }: { contact: ContactFile }) => {
    if (!contact.id || !contact.odinId) {
      console.warn('Missing data to fetch new contact data reliable');
      return;
    }

    let newContact: ContactFile | undefined;

    const connectionInfo = (await fetchConnectionInfo(dotYouClient, contact.odinId)) ?? undefined;
    newContact = connectionInfo ? { ...contact, ...connectionInfo } : undefined;

    if (newContact) {
      newContact = await saveContact(dotYouClient, {
        ...newContact,
        odinId: contact.odinId,
        versionTag: contact.versionTag,
      });

      return;
    } else {
      const publicContact = await fetchDataFromPublic(contact.odinId, true);
      if (!publicContact) return;
      newContact = await saveContact(dotYouClient, {
        ...publicContact,
        odinId: contact.odinId,
        versionTag: contact.versionTag,
      });
    }
  };

  return {
    fetch: useQuery(
      ['contact', odinId ?? id, loadPicture],
      () =>
        fetchSingle({
          odinId: odinId as string, // Defined as otherwise query would not be triggered
          id: id as string, // Defined as otherwise query would not be triggered
          loadPicture: loadPicture,
        }),
      {
        refetchOnWindowFocus: false,
        onError: (err) => console.error(err),
        retry: false,
        enabled: !!odinId || !!id,
      }
    ),
    refresh: useMutation(refresh, {
      onMutate: async (newContact) => {
        await queryClient.cancelQueries(['contact', odinId ?? id]);

        // Update single attribute
        const previousContact = queryClient.getQueryData(['contact', odinId ?? id]);
        // TODO: fix, can't be set as the incoming new isn't the refresh data
        queryClient.setQueryData(['contact', odinId ?? id], newContact);

        return { previousContact, newContact };
      },
      onError: (err, _newAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        queryClient.setQueryData(['contact', odinId ?? id], context?.previousContact);
      },
      onSettled: () => {
        queryClient.invalidateQueries(['contact', odinId]);
        queryClient.invalidateQueries(['contact', id]);
      },
    }),
  };
};

export const parseContact = (contact: RawContact): ContactVm => {
  const imageUrl =
    contact.image && !contact.imageFileId
      ? `data:${contact.image.contentType};base64,${contact.image.content}`
      : undefined;

  const { id, name, location, phone, birthday, imageFileId, odinId, source } = contact;

  return {
    id,
    name,
    location,
    phone,
    birthday,
    imageFileId,

    imageUrl,
    odinId,
    source,
  };
};

export default useContact;
