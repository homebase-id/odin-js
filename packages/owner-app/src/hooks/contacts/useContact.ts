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
import { HomebaseFile, NewHomebaseFile, SecurityGroupType } from '@youfoundation/js-lib/core';

export const useContact = ({
  odinId,
  id,
  canSave,
}: {
  odinId?: string;
  id?: string;
  canSave: boolean;
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
  }): Promise<HomebaseFile<ContactVm> | NewHomebaseFile<ContactVm> | undefined> => {
    if (!odinId) {
      if (!id) return;

      //Direct fetch with id:
      return (await getContactByUniqueId(dotYouClient, id)) || undefined;
    }

    const hasCache =
      !!odinId &&
      queryClient.getQueryData<HomebaseFile<ContactVm> | NewHomebaseFile<ContactVm> | undefined>([
        'contact',
        odinId,
        canSave,
      ]);

    // Direct fetch with odinId:
    // Use the data from the contact book, if it exists and if it's a contact level source or we are not allowed to save anyway
    // TODO: Not sure if this is the best way yet... But it works for now
    const contactBookContact = await getContactByOdinId(dotYouClient, odinId);
    if (
      !hasCache && // If we have a contact on drive, and we don't have cache, we need a fast return; Otherwise we trigger a refresh
      contactBookContact &&
      contactBookContact.fileMetadata.appData.content.source === 'contact'
    ) {
      return contactBookContact;
    } else if (contactBookContact)
      console.log(
        `[${odinId}] [${!hasCache ? 'Explicit' : 'Implicit'}] Ignoring contact book record`,
        contactBookContact
      );

    const returnContact =
      (await fetchConnectionInfo(dotYouClient, odinId)) || (await fetchDataFromPublic(odinId));

    if (!returnContact) return undefined;

    const contactFile: NewHomebaseFile<ContactFile> = {
      fileId: contactBookContact?.fileId,
      fileMetadata: {
        appData: { content: { ...returnContact, odinId: odinId } },
        versionTag: contactBookContact?.fileMetadata.versionTag,
      },
      serverMetadata: {
        accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
      },
    };

    if (canSave) {
      const savedReturnedContact = await saveContact(dotYouClient, contactFile);
      return parseContact(savedReturnedContact);
    }

    return parseContact(contactFile);
  };

  const refresh = async ({ contact }: { contact: HomebaseFile<ContactFile> }) => {
    if (!contact.fileMetadata.appData.uniqueId || !contact.fileMetadata.appData.content.odinId) {
      console.warn('Missing data to fetch new contact data reliable');
      return;
    }

    const connectionInfo =
      (await fetchConnectionInfo(dotYouClient, contact.fileMetadata.appData.content.odinId)) ??
      undefined;
    const newContact = connectionInfo
      ? { ...contact.fileMetadata.appData.content, ...connectionInfo }
      : undefined;

    if (newContact) {
      await saveContact(dotYouClient, {
        ...contact,
        fileMetadata: {
          ...contact.fileMetadata,
          appData: { content: { ...newContact, odinId: odinId } },
        },
      });

      return;
    } else {
      const publicContact = await fetchDataFromPublic(contact.fileMetadata.appData.content.odinId);
      if (!publicContact) return;
      await saveContact(dotYouClient, {
        ...contact,
        fileMetadata: {
          ...contact.fileMetadata,
          appData: { content: { ...publicContact, odinId: odinId } },
        },
      });
    }
  };

  return {
    fetch: useQuery({
      queryKey: ['contact', odinId ?? id, canSave],
      queryFn: () =>
        fetchSingle({
          odinId: odinId as string, // Defined as otherwise query would not be triggered
          id: id as string, // Defined as otherwise query would not be triggered
          canSave: canSave,
        }),
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: false,
      enabled: !!odinId || !!id,
    }),
    refresh: useMutation({
      mutationFn: refresh,
      onMutate: async (newContact) => {
        await queryClient.cancelQueries({ queryKey: ['contact', odinId ?? id] });

        // Update single attribute
        const previousContact = queryClient.getQueryData(['contact', odinId ?? id]);

        return { previousContact, newContact };
      },
      onError: (err, _newAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        queryClient.setQueryData(['contact', odinId ?? id], context?.previousContact);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['contact', odinId] });
        queryClient.invalidateQueries({ queryKey: ['contact', id] });
      },
    }),
  };
};

export const parseContact = (
  contact: HomebaseFile<RawContact> | NewHomebaseFile<RawContact>
): HomebaseFile<ContactVm> | NewHomebaseFile<ContactVm> => {
  const pureContent = contact.fileMetadata.appData.content;

  const imageUrl = pureContent.image
    ? `data:${pureContent.image.contentType};base64,${pureContent.image.content}`
    : `https://${pureContent.odinId}/pub/image`;

  const { name, location, phone, birthday, odinId, source } = pureContent;

  return {
    ...contact,
    fileMetadata: {
      ...contact.fileMetadata,
      updated: (contact as HomebaseFile<unknown>).fileMetadata.updated,
      appData: {
        ...contact.fileMetadata.appData,
        uniqueId: contact.fileMetadata.appData.uniqueId,
        content: {
          name,

          location,
          phone,
          birthday,

          imageUrl,
          odinId,
          source,
        },
      },
    },
  } as HomebaseFile<ContactVm>;
};
