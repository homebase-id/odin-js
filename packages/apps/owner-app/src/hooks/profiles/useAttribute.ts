import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Attribute, getProfileAttribute } from '@homebase-id/js-lib/profile';
import {
  invalidateSiteData,
  useOdinClientContext,
  useStaticFiles,
} from '@homebase-id/common-app';
import { AttributeDefinitions } from './AttributeDefinitions';
import { AttributeVm, invalidateAttributes, updateCacheAttributes } from './useAttributes';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { HomePageAttributes, HomePageConfig } from '@homebase-id/js-lib/public';
import {
  removeProfileAttribute,
  saveProfileAttribute,
} from '../../provider/profile/AttributeData/ManageAttributeProvider';
import { invalidateAttributeVersions } from './useAttributeVersions';

const getListItemCacheKey = (newAttrVm: Attribute) => {
  return newAttrVm.type !== HomePageAttributes.Theme
    ? { profileId: newAttrVm.profileId, sectionId: newAttrVm.sectionId }
    : { profileId: HomePageConfig.DefaultDriveId, sectionId: newAttrVm.type };
};

export const useAttribute = (props?: { profileId?: string; attributeId?: string }) => {
  const { profileId, attributeId } = props || {};
  const odinClient = useOdinClientContext();

  const queryClient = useQueryClient();
  const { mutate: publishStaticFiles } = useStaticFiles().publish;

  // Externals
  const fetchData = async (profileId?: string, attributeId?: string) => {
    if (!profileId || !attributeId) {
      return null;
    }
    const foundAttribute = await getProfileAttribute(odinClient, profileId, attributeId);

    return foundAttribute || null;
  };

  const saveData = async (attribute: NewHomebaseFile<Attribute> | HomebaseFile<Attribute>) => {
    const onVersionConflict = async () => {
      const serverAttr = await getProfileAttribute(
        odinClient,
        attribute.fileMetadata.appData.content.profileId,
        attribute.fileMetadata.appData.content.id
      );
      if (!serverAttr || !serverAttr.fileMetadata.appData.content) return;

      const newAttr = { ...attribute, ...(serverAttr as HomebaseFile<Attribute>) };
      return saveProfileAttribute(odinClient, newAttr, onVersionConflict);
    };

    // Don't edit original attribute as it will be used for caching decisions in onSettled
    const uploadResult = saveProfileAttribute(
      odinClient,
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
      return await removeProfileAttribute(odinClient, profileId, attribute.fileId);
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

        const updatedDsr: NewHomebaseFile<AttributeVm> | HomebaseFile<AttributeVm> = {
          ...newDsr,
          fileMetadata: {
            ...newDsr.fileMetadata,
            appData: {
              ...newDsr.fileMetadata.appData,
              content: newAttrVm,
            },
          },
        };

        const previousAttr = updateCacheAttribute(
          queryClient,
          newAttrVm.profileId,
          newAttrVm.id,
          () => updatedDsr
        );

        // Update section attributes
        const { profileId, sectionId } = getListItemCacheKey(newAttrVm);
        const previousAttributes = updateCacheAttributes(
          queryClient,
          profileId,
          sectionId,
          (data) =>
            (data?.some((attr) => attr.fileMetadata.appData.content.id === newAttrVm.id)
              ? data?.map((attr) =>
                attr.fileMetadata.appData.content.id === newAttrVm.id ? updatedDsr : attr
              )
              : [updatedDsr, ...(data ?? [])]
            )?.sort(
              (a, b) =>
                a.fileMetadata.appData.content.priority - b.fileMetadata.appData.content.priority
            )
        );

        return { previousAttr, newAttr, previousAttributes };
      },
      onError: (err, newAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        const previousAttr = context?.previousAttr;
        previousAttr &&
          updateCacheAttribute(
            queryClient,
            newAttr.fileMetadata.appData.content.profileId,
            newAttr.fileMetadata.appData.content.id,
            () => previousAttr
          );

        const { profileId, sectionId } =
          (context?.newAttr && getListItemCacheKey(context?.newAttr)) || {};
        const previousAttributes = context?.previousAttributes;
        previousAttributes &&
          profileId &&
          sectionId &&
          updateCacheAttributes(queryClient, profileId, sectionId, () => previousAttributes);
      },
      onSettled: (newDsr, _error, _variables) => {
        if (!newDsr) return;
        const newAttr = newDsr.fileMetadata.appData.content;

        const { profileId, sectionId } = getListItemCacheKey(newAttr);

        invalidateAttribute(queryClient, profileId, newAttr.id);
        invalidateSiteData(queryClient);
        invalidateAttributes(queryClient, profileId, _variables.fileId ? sectionId : undefined);
        invalidateAttributeVersions(queryClient, profileId, newAttr.type);
      },
      onSuccess: (updatedAttr) => {
        if (!updatedAttr) return;
        publishStaticFiles(updatedAttr.fileMetadata.appData.content.type);
      },
    }),
    remove: useMutation({
      mutationFn: removeBroken,
      onMutate: async ({ attribute }) => {
        const toRemoveAttr = attribute.fileMetadata.appData.content;
        if (!toRemoveAttr) return;

        updateCacheAttributes(queryClient, toRemoveAttr.profileId, toRemoveAttr.sectionId, (data) =>
          data.filter((attr) => attr.fileMetadata.appData.content.id !== toRemoveAttr.id)
        );

        // Update section attributes
        const { profileId, sectionId } = getListItemCacheKey(toRemoveAttr);
        const previousAttributes = updateCacheAttributes(
          queryClient,
          profileId,
          sectionId,
          (data) => data.filter((attr) => attr.fileMetadata.appData.content.id !== toRemoveAttr.id)
        );

        return { toRemoveAttr, previousAttributes };
      },
      onError: (err, data, context) => {
        console.error(err);
        const toRemoveAttr = data.attribute.fileMetadata.appData.content;
        if (!toRemoveAttr || !context?.previousAttributes) return;

        const { profileId, sectionId } = getListItemCacheKey(toRemoveAttr);
        // Revert local caches to what they were
        updateCacheAttributes(queryClient, profileId, sectionId, () => context?.previousAttributes);
      },
      onSettled: (_data, _err, variables) => {
        const newAttr = variables.attribute.fileMetadata.appData.content;
        if (!newAttr) {
          invalidateAttributes(
            queryClient,
            (variables.attribute.fileMetadata.appData.content as Attribute)?.profileId ||
            variables.overrideProfileId
          );
          return;
        }
        // Settimeout to allow serverSide a bit more time to process remove before fetching the data again
        setTimeout(() => {
          invalidateSiteData(queryClient);
          const { profileId, sectionId } = getListItemCacheKey(newAttr);
          invalidateAttributes(queryClient, profileId, sectionId);

          publishStaticFiles(variables.attribute?.fileMetadata?.appData?.content?.type);
        }, 1000);
      },
    }),
  };
};

export const invalidateAttribute = (
  queryClient: QueryClient,
  profileId?: string,
  attributeId?: string
) => {
  queryClient.invalidateQueries({
    queryKey: ['attribute', profileId, attributeId],
    exact: !!profileId && !!attributeId,
  });
};

export const updateCacheAttribute = (
  queryClient: QueryClient,
  profileId: string,
  attributeId: string,
  transformFn: (
    data: HomebaseFile<Attribute>
  ) => HomebaseFile<Attribute> | NewHomebaseFile<Attribute> | undefined
) => {
  const currentData = queryClient.getQueryData<HomebaseFile<Attribute>>([
    'attribute',
    profileId,
    attributeId,
  ]);
  if (!currentData) return;

  const newData = transformFn(currentData);
  if (!newData) return;
  queryClient.setQueryData(['attribute', profileId, attributeId], newData);
};
