import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Attribute,
  AttributeFile,
  getAttribute,
  saveAttribute,
  removeAttribute,
} from '@youfoundation/js-lib/profile';
import useAuth from '../auth/useAuth';
import { useStaticFiles } from '@youfoundation/common-app';
import { AttributeDefinitions } from './AttributeDefinitions';
import { AttributeVm } from './useAttributes';
import { SecurityGroupType } from '@youfoundation/js-lib/core';
import { HomePageAttributes, HomePageConfig } from '@youfoundation/js-lib/public';

const getListItemCacheKey = (newAttrVm: Attribute) => {
  return [
    'attributes',
    ...(newAttrVm.type !== HomePageAttributes.HomePage &&
    newAttrVm.type !== HomePageAttributes.Theme
      ? [newAttrVm.profileId, newAttrVm.sectionId]
      : [HomePageConfig.DefaultDriveId, newAttrVm.type]),
  ];
};

const useAttribute = ({ profileId, attributeId }: { profileId?: string; attributeId?: string }) => {
  const dotYouClient = useAuth().getDotYouClient();

  const queryClient = useQueryClient();
  const { mutate: publishStaticFiles } = useStaticFiles().publish;

  // Externals
  const fetchData = async (profileId?: string, attributeId?: string) => {
    if (!profileId || !attributeId) {
      return null;
    }
    const foundAttribute = await getAttribute(dotYouClient, profileId, attributeId);

    return foundAttribute || null;
  };

  const saveData = async (attribute: AttributeFile) => {
    // We're saving, so it's not new anymore
    if (attribute.data?.isNew) delete attribute.data.isNew;

    return new Promise<AttributeFile>((resolve) => {
      const onVersionConflict = async () => {
        const serverAttr = await getAttribute(dotYouClient, attribute.profileId, attribute.id);
        if (!serverAttr) return;

        const newAttr = { ...attribute, ...serverAttr };
        saveAttribute(dotYouClient, newAttr, onVersionConflict).then((result) => {
          if (result) resolve(result);
        });
      };

      // Don't edit original attribute as it will be used for caching decisions in onSettled
      saveAttribute(
        dotYouClient,
        {
          ...attribute,
          acl: attribute.acl ?? { requiredSecurityGroup: SecurityGroupType.Owner },
        },
        onVersionConflict
      ).then((result) => {
        if (result) resolve(result);
      });
    });
  };

  const removeData = async (attribute: AttributeFile) => {
    if (attribute.fileId) {
      return await removeAttribute(dotYouClient, attribute.profileId, attribute.fileId);
    } else {
      console.error('No FileId provided for removeData');
    }
  };

  return {
    fetch: useQuery(
      ['attribute', profileId, attributeId],
      () => fetchData(profileId, attributeId),
      {
        refetchOnWindowFocus: false,
        enabled: !!profileId && !!attributeId,
      }
    ),
    save: useMutation(saveData, {
      onMutate: async (newAttr) => {
        await queryClient.cancelQueries(['attribute', newAttr.profileId, newAttr.id]);

        let typeDefinition = Object.values(AttributeDefinitions).find((def) => {
          return def.type.toString() === newAttr.type;
        });

        if (!typeDefinition) {
          if (newAttr.type === HomePageAttributes.HomePage) {
            typeDefinition = {
              type: HomePageAttributes.HomePage,
              name: 'Homepage',
              description: '',
            };
          } else if (newAttr.type === HomePageAttributes.Theme) {
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

        // Update single attribute
        const singleItemCacheKey = ['attribute', newAttrVm.profileId, newAttrVm.id];
        const previousAttr = queryClient.getQueryData(singleItemCacheKey);
        queryClient.setQueryData(singleItemCacheKey, newAttrVm);

        // Update section attributes
        const listItemCacheKey = getListItemCacheKey(newAttrVm);
        const previousAttributes: AttributeVm[] | undefined =
          queryClient.getQueryData(listItemCacheKey);

        // if new attribute can't be found in existing list, then it's a new one, so can't update but need to add
        // Sorting happens here, as it otherwise happens within the provider
        const newAttributes = (
          previousAttributes?.some((attr) => attr.id === newAttrVm.id)
            ? previousAttributes?.map((attr) => (attr.id === newAttrVm.id ? newAttrVm : attr))
            : [newAttrVm, ...(previousAttributes ?? [])]
        )?.sort((a, b) => a.priority - b.priority);

        queryClient.setQueryData(listItemCacheKey, newAttributes);

        return { previousAttr, newAttr, previousAttributes };
      },
      onError: (err, newAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        queryClient.setQueryData(
          ['attribute', newAttr.profileId, context?.newAttr.id],
          context?.previousAttr
        );
        queryClient.setQueryData(getListItemCacheKey(newAttr), context?.previousAttributes);
      },
      onSettled: (newAttr, _error, _variables) => {
        if (!newAttr) return;

        if (newAttr.id) {
          queryClient.invalidateQueries(['attribute', newAttr.profileId, newAttr.id]);
        } else {
          queryClient.invalidateQueries(['attribute']);
        }

        queryClient.invalidateQueries(['siteData']);
        queryClient.invalidateQueries(getListItemCacheKey(newAttr));

        if (!_variables.fileId) {
          queryClient.invalidateQueries(['attributes']);
        }
        queryClient.invalidateQueries(['attributeVersions', newAttr.profileId, newAttr.type]);
      },
      onSuccess: () => {
        publishStaticFiles();
      },
    }),
    remove: useMutation(removeData, {
      onMutate: async (toRemoveAttr) => {
        await queryClient.cancelQueries([
          'attributes',
          toRemoveAttr.profileId,
          toRemoveAttr.sectionId,
        ]);

        // Update section attributes
        const listItemCacheKey = getListItemCacheKey(toRemoveAttr);
        const previousAttributes: AttributeVm[] | undefined =
          queryClient.getQueryData(listItemCacheKey);
        const updatedAttributes = previousAttributes?.filter((attr) => attr.id !== toRemoveAttr.id);
        queryClient.setQueryData(listItemCacheKey, updatedAttributes);

        return { toRemoveAttr, previousAttributes };
      },
      onError: (err, toRemoveAttr, context) => {
        console.error(err);

        // Revert local caches to what they were
        queryClient.setQueryData(getListItemCacheKey(toRemoveAttr), context?.previousAttributes);
      },
      onSettled: (_data, _err, variables) => {
        // Settimeout to allow serverSide a bit more time to process remove before fetching the data again
        setTimeout(() => {
          queryClient.invalidateQueries(['siteData']);
          queryClient.invalidateQueries(getListItemCacheKey(variables));

          publishStaticFiles();
        }, 1000);
      },
    }),
  };
};

export default useAttribute;
