import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { saveContact } from '../../provider/contact/ContactProvider';
import {
  fetchConnectionInfo,
  fetchDataFromPublic,
} from '../../provider/contact/ContactSourceProvider';
import { useAuth } from '../auth/useAuth';
import {
  ContactFile,
  ContactVm,
  RawContact,
  getContactByOdinId,
  getContactByUniqueId,
} from '@youfoundation/js-lib/network';

export const useContact = ({
  odinId,
  id,
  canSave = true,
}: {
  odinId?: string;
  id?: string;
  canSave?: boolean;
}) => {
  const dotYouClient = useAuth().getDotYouClient();
  const queryClient = useQueryClient();

  const fetchSingle = async ({
    odinId,
    id,
    canSave,
  }: {
    odinId: string;
    id: string;
    canSave?: boolean;
  }): Promise<ContactVm | undefined> => {
    if (!odinId) {
      if (!id) return;

      //Direct fetch with id:
      return await getContactByUniqueId(dotYouClient, id);
    }

    // Direct fetch with odinId:
    const contactBookContact = await getContactByOdinId(dotYouClient, odinId);
    // Use the data from the contact book, if it exists and if it's a contact level source or we are not allowed to save anyway
    // TODO: Not sure if this is the best way yet... But it works for now
    if (contactBookContact && (contactBookContact.source === 'contact' || !canSave))
      return contactBookContact;
    else if (contactBookContact)
      console.log(`[${odinId}] Ignoring contact book record`, contactBookContact);
    let returnContact;

    // If no contact in the contact book:
    // Get contact data from ICRs/Remote Attributes:
    const connectionInfo = await fetchConnectionInfo(dotYouClient, odinId);
    if (connectionInfo) {
      returnContact = connectionInfo;
    } else {
      // Or from their public data
      const publicContact = await fetchDataFromPublic(odinId);
      returnContact = publicContact ? { ...publicContact } : returnContact;
    }

    if (returnContact) {
      // Only save contacts if we were allowed to or if the source is of the "contact" level
      if (canSave) {
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
      const publicContact = await fetchDataFromPublic(contact.odinId);
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
      ['contact', odinId ?? id, canSave],
      () =>
        fetchSingle({
          odinId: odinId as string, // Defined as otherwise query would not be triggered
          id: id as string, // Defined as otherwise query would not be triggered
          canSave: canSave,
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
      : `https://${contact.odinId}/pub/image`;

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
