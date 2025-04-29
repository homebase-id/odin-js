import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ContactConfig,
  ContactFile,
  ContactVm,
  RawContact,
  getContactByOdinId,
  getContactByUniqueId,
} from '@homebase-id/js-lib/network';
import {
  ApiType,
  DotYouClient,
  HomebaseFile,
  NewHomebaseFile,
  SecurityGroupType,
} from '@homebase-id/js-lib/core';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';
import {
  fetchConnectionInfo,
  fetchDataFromPublic,
} from '../../provider/contact/ContactSourceProvider';
import { saveContact } from '../../provider/contact/ContactProvider';
import { useHasWriteAccess } from '../securityContext/useHasWriteAccess';
import { useHasReadAccess } from '../securityContext/useHasReadAccess';

export const useContact = ({
  odinId,
  id,
  canSave,
}: {
  odinId?: string;
  id?: string;
  canSave: boolean;
}) => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();
  const hasContactDriveWriteAccess = useHasWriteAccess(ContactConfig.ContactTargetDrive);
  const hasContactDriveReadAccess = useHasReadAccess(ContactConfig.ContactTargetDrive);

  const fetchSingle = async ({
    odinId,
    id,
    canSave,
  }: {
    odinId: string;
    id: string;
    canSave?: boolean;
  }): Promise<HomebaseFile<ContactVm> | NewHomebaseFile<ContactVm> | null> => {
    if (!hasContactDriveReadAccess) return null;

    if (!odinId) {
      if (!id) return null;

      //Direct fetch with id:
      return (await getContactByUniqueId(dotYouClient, id)) || null;
    }

    const hasCache =
      !!odinId &&
      queryClient.getQueryData<HomebaseFile<ContactVm> | NewHomebaseFile<ContactVm> | null>([
        'contact',
        odinId,
        canSave,
      ]);

    // Direct fetch with odinId:
    // Use the data from the contact book, if it exists and if it's a contact level source or we are not allowed to save anyway
    const contactBookContact = (await getContactByOdinId(dotYouClient, odinId)) ?? null;
    if (
      !hasCache && // If we have a contact on drive, and we don't have cache, we need a fast return; Otherwise we trigger a refresh
      contactBookContact &&
      contactBookContact.fileMetadata.appData.content.source === 'contact'
    ) {
      return contactBookContact;
    } else if (contactBookContact)
      console.debug(
        `[${odinId}] [${!hasCache ? 'Explicit' : 'Implicit'}] Ignoring contact book record`,
        contactBookContact
      );

    const returnContact =
      (await fetchConnectionInfo(dotYouClient, odinId)) || (await fetchDataFromPublic(odinId));

    if (!returnContact) return null;

    const contactFile: NewHomebaseFile<ContactFile> = {
      fileId: contactBookContact?.fileId,
      fileMetadata: {
        appData: { content: { ...returnContact, odinId: odinId } },
        versionTag: contactBookContact?.fileMetadata.versionTag,
      },
      serverMetadata: {
        accessControlList: { requiredSecurityGroup: SecurityGroupType.Owner },
      },
      sharedSecretEncryptedKeyHeader: contactBookContact?.sharedSecretEncryptedKeyHeader,
    };

    if (canSave && hasContactDriveWriteAccess) {
      const uploadResult = await saveContact(dotYouClient, contactFile);
      const savedContactFile = {
        ...contactFile,
        fileId: uploadResult?.file.fileId,
        fileMetaData: { ...contactFile.fileMetadata, versionTag: uploadResult?.newVersionTag },
      };

      return parseContact(savedContactFile);
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
        sharedSecretEncryptedKeyHeader: contact.sharedSecretEncryptedKeyHeader,
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
      retry: false,
      enabled: (!!odinId || !!id) && !!hasContactDriveReadAccess,
    }),
    refresh: useMutation({
      mutationFn: refresh,
      onMutate: async ({ contact }) => {
        const previousContact =
          (odinId && updateCacheContact(queryClient, odinId, () => contact)) ||
          (id && updateCacheContact(queryClient, id, () => contact));
        return { previousContact, contact };
      },
      onError: (err, _newAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        const previousContact = context?.previousContact;
        previousContact && odinId && updateCacheContact(queryClient, odinId, () => previousContact);
        previousContact && id && updateCacheContact(queryClient, id, () => previousContact);
      },
      onSettled: () => {
        odinId && invalidateContact(queryClient, odinId);
        id && invalidateContact(queryClient, id);
      },
    }),
  };
};

export const invalidateContact = (queryClient: QueryClient, odinId: string) => {
  queryClient.invalidateQueries({ queryKey: ['contact', odinId] });
};

export const updateCacheContact = (
  queryClient: QueryClient,
  odinId: string,
  transformFn: (data: HomebaseFile<ContactFile>) => HomebaseFile<ContactFile> | undefined
) => {
  const currentData = queryClient.getQueryData<HomebaseFile<ContactFile> | undefined>([
    'contact',
    odinId,
  ]);
  if (!currentData) return;

  const newData = transformFn(currentData);
  if (!newData) return;

  queryClient.setQueryData(['contact', odinId], newData);
  return currentData;
};

export const parseContact = (
  contact: HomebaseFile<RawContact> | NewHomebaseFile<RawContact>
): HomebaseFile<ContactVm> | NewHomebaseFile<ContactVm> => {
  const pureContent = contact.fileMetadata.appData.content;

  const imageUrl = pureContent.image
    ? `data:${pureContent.image.contentType};base64,${pureContent.image.content}`
    : pureContent.odinId
      ? `${new DotYouClient({ hostIdentity: pureContent.odinId, api: ApiType.Guest }).getRoot()}/pub/image`
      : undefined;

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
