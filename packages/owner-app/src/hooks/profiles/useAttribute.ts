import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Attribute, getProfileAttribute } from '@homebase-id/js-lib/profile';
import { useAuth } from '../auth/useAuth';
import { useStaticFiles } from '@homebase-id/common-app';
import { AttributeDefinitions } from './AttributeDefinitions';
import { AttributeVm } from './useAttributes';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { HomePageAttributes, HomePageConfig } from '@homebase-id/js-lib/public';
import {
  removeProfileAttribute,
  saveProfileAttribute,
} from '../../provider/profile/AttributeData/ManageAttributeProvider';

const getListItemCacheKey = (newAttrVm: Attribute) => {
  return [
    'attributes',
    ...(newAttrVm.type !== HomePageAttributes.Theme
      ? [newAttrVm.profileId, newAttrVm.sectionId]
      : [HomePageConfig.DefaultDriveId, newAttrVm.type]),
  ];
};

export const useAttribute = (props?: { profileId?: string; attributeId?: string }) => {
  const { profileId, attributeId } = props || {};
  const dotYouClient = useAuth().getDotYouClient();

  const queryClient = useQueryClient();
  const { mutate: publishStaticFiles } = useStaticFiles().publish;

  // Externals
  const fetchData = async (profileId?: string, attributeId?: string) => {
    if (!profileId || !attributeId) {
      return null;
    }
    const foundAttribute = await getProfileAttribute(dotYouClient, profileId, attributeId);

    return foundAttribute || null;
  };

  const saveData = async (attribute: NewHomebaseFile<Attribute> | HomebaseFile<Attribute>) => {
    const onVersionConflict = async () => {
      const serverAttr = await getProfileAttribute(
        dotYouClient,
        attribute.fileMetadata.appData.content.profileId,
        attribute.fileMetadata.appData.content.id
      );
      if (!serverAttr || !serverAttr.fileMetadata.appData.content) return;

      const newAttr = { ...attribute, ...(serverAttr as HomebaseFile<Attribute>) };
      return saveProfileAttribute(dotYouClient, newAttr, onVersionConflict);
    };

    // Don't edit original attribute as it will be used for caching decisions in onSettled
    const uploadResult = saveProfileAttribute(
      dotYouClient,
      {
        ...attribute,
      },
      onVersionConflict
    );
    if (!uploadResult) return null;
    return uploadResult;
  };

  const removeBroken = async ({
    attribute,
    overrideProfileId,
  }: {
    attribute: HomebaseFile<Attribute | undefined>;
    overrideProfileId?: string;
  }) => {
    const profileId =
      (attribute.fileMetadata.appData.content as Attribute)?.profileId || overrideProfileId;

    if (attribute.fileId && profileId)
      return await removeProfileAttribute(dotYouClient, profileId, attribute.fileId);
    else console.error('No FileId provided for removeData');
  };

  return {
    fetch: useQuery({
      queryKey: ['attribute', profileId, attributeId],
      queryFn: () => fetchData(profileId, attributeId),

      refetchOnWindowFocus: false,
      enabled: !!profileId && !!attributeId,
    }),
    save: useMutation({
      mutationFn: saveData,
      onMutate: async (newDsr) => {
        const newAttr = newDsr.fileMetadata.appData.content;
        await queryClient.cancelQueries({ queryKey: ['attribute', newAttr.profileId, newAttr.id] });

        let typeDefinition = Object.values(AttributeDefinitions).find((def) => {
          return def.type.toString() === newAttr.type;
        });

        if (!typeDefinition) {
          if (newAttr.type === HomePageAttributes.Theme) {
            typeDefinition = {
              type: HomePageAttributes.Theme,
              name: 'Theme',
              description: '',
            };
          }
          return;
        }

        const newAttrVm: AttributeVm = {
          ...newAttr,
          typeDefinition,
        };

        const updatedDsr: NewHomebaseFile<AttributeVm> = {
          ...newDsr,
          fileMetadata: {
            ...newDsr.fileMetadata,
            appData: {
              ...newDsr.fileMetadata.appData,
              content: newAttrVm,
            },
          },
        };

        // Update single attribute
        const singleItemCacheKey = ['attribute', newAttrVm.profileId, newAttrVm.id];
        const previousAttr = queryClient.getQueryData(singleItemCacheKey);
        queryClient.setQueryData(singleItemCacheKey, updatedDsr);

        // Update section attributes
        const listItemCacheKey = getListItemCacheKey(newAttrVm);
        const previousAttributes: HomebaseFile<AttributeVm>[] | undefined =
          queryClient.getQueryData(listItemCacheKey);

        // if new attribute can't be found in existing list, then it's a new one, so can't update but need to add
        // Sorting happens here, as it otherwise happens within the provider
        const newAttributes = (
          previousAttributes?.some((attr) => attr.fileMetadata.appData.content.id === newAttrVm.id)
            ? previousAttributes?.map((attr) =>
                attr.fileMetadata.appData.content.id === newAttrVm.id ? updatedDsr : attr
              )
            : [updatedDsr, ...(previousAttributes ?? [])]
        )?.sort(
          (a, b) =>
            a.fileMetadata.appData.content.priority - b.fileMetadata.appData.content.priority
        );

        queryClient.setQueryData(listItemCacheKey, newAttributes);

        return { previousAttr, newAttr, previousAttributes };
      },
      onError: (err, newAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        queryClient.setQueryData(
          ['attribute', newAttr.fileMetadata.appData.content.profileId, context?.newAttr.id],
          context?.previousAttr
        );
        queryClient.setQueryData(
          getListItemCacheKey(newAttr.fileMetadata.appData.content),
          context?.previousAttributes
        );
      },
      onSettled: (newDsr, _error, _variables) => {
        if (!newDsr) return;
        const newAttr = newDsr.fileMetadata.appData.content;
        if (newAttr.id) {
          queryClient.invalidateQueries({ queryKey: ['attribute', newAttr.profileId, newAttr.id] });
        } else {
          queryClient.invalidateQueries({ queryKey: ['attribute'] });
        }

        queryClient.invalidateQueries({ queryKey: ['site-data'] });
        queryClient.invalidateQueries({ queryKey: getListItemCacheKey(newAttr) });

        if (!_variables.fileId) {
          queryClient.invalidateQueries({ queryKey: ['attributes'] });
        }
        queryClient.invalidateQueries({
          queryKey: ['attributeVersions', newAttr.profileId, newAttr.type],
        });
      },
      onSuccess: (updatedAttr) => {
        if (!updatedAttr) return;
        publishStaticFiles(updatedAttr.fileMetadata.appData.content.type);
      },
    }),
    remove: useMutation({
      mutationFn: removeBroken,
      onMutate: async (data) => {
        const toRemoveAttr = data.attribute.fileMetadata.appData.content;
        if (!toRemoveAttr) return;

        await queryClient.cancelQueries({
          queryKey: ['attributes', toRemoveAttr.profileId, toRemoveAttr.sectionId],
        });

        // Update section attributes
        const listItemCacheKey = getListItemCacheKey(toRemoveAttr);
        const previousAttributes: HomebaseFile<Attribute>[] | undefined =
          queryClient.getQueryData(listItemCacheKey);

        const updatedAttributes = previousAttributes?.filter(
          (attr) => attr.fileMetadata.appData.content.id !== toRemoveAttr.id
        );
        queryClient.setQueryData(listItemCacheKey, updatedAttributes);

        return { toRemoveAttr, previousAttributes };
      },
      onError: (err, data, context) => {
        console.error(err);
        const toRemoveAttr = data.attribute.fileMetadata.appData.content;
        if (!toRemoveAttr) return;
        // Revert local caches to what they were
        queryClient.setQueryData(getListItemCacheKey(toRemoveAttr), context?.previousAttributes);
      },
      onSettled: (_data, _err, variables) => {
        const newAttr = variables.attribute.fileMetadata.appData.content;
        if (!newAttr) {
          queryClient.invalidateQueries({ queryKey: ['attributes'], exact: false });
          return;
        }
        // Settimeout to allow serverSide a bit more time to process remove before fetching the data again
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['site-data'] });
          queryClient.invalidateQueries({ queryKey: getListItemCacheKey(newAttr) });

          publishStaticFiles(variables.attribute?.fileMetadata?.appData?.content?.type);
        }, 1000);
      },
    }),
  };
};
