import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AccessControlList,
  ApiType,
  Attribute,
  BuiltInAttributes,
  AttributeFile,
  HomePageAttributes,
  HomePageConfig,
  HomePageFields,
  MinimalProfileFields,
  SecurityGroupType,
  TargetDrive,
  DotYouClient,
  getDecryptedImageData,
  uploadImage,
  GetTargetDriveFromProfileId,
  getAttribute,
  saveAttribute,
  removeAttribute,
  aclEqual,
  getFileHeader,
} from '@youfoundation/js-lib';
import { getDisplayNameOfNameAttribute } from '../../helpers/common';
import useAuth from '../auth/useAuth';
import useStaticFiles from '../staticFiles/useStaticFiles';
import { AttributeDefinitions } from './AttributeDefinitions';
import { AttributeVm } from './useAttributes';

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

  // Helpers:
  const nameAttributeProcessing = (nameAttr: AttributeFile): AttributeFile => {
    const newData = { ...nameAttr.data };
    newData[MinimalProfileFields.DisplayName] = getDisplayNameOfNameAttribute(nameAttr);

    return { ...nameAttr, data: newData };
  };

  const confirmDependencyAcl = async (
    targetAcl: AccessControlList,
    targetDrive: TargetDrive,
    fileId: string
  ) => {
    if (fileId) {
      const imageFileMeta = await getFileHeader(dotYouClient, targetDrive, fileId);

      if (imageFileMeta && !aclEqual(targetAcl, imageFileMeta.serverMetadata.accessControlList)) {
        // Not what it should be, going to reupload it in full
        const imageData = await getDecryptedImageData(dotYouClient, targetDrive, fileId);
        if (imageData) {
          await uploadImage(
            dotYouClient,
            targetDrive,
            targetAcl,
            new Uint8Array(imageData.bytes),
            undefined,
            {
              fileId,
              versionTag: imageFileMeta.fileMetadata.versionTag,
              type: imageData.contentType,
            }
          );
        }
      }
    }
  };

  const photoAttributeProcessing = async (attr: AttributeFile): Promise<AttributeFile> => {
    const imageFieldKey = MinimalProfileFields.ProfileImageId;
    const imageFileId = attr.data[imageFieldKey];
    const targetDrive = GetTargetDriveFromProfileId(attr.profileId);

    await confirmDependencyAcl(attr.acl, targetDrive, imageFileId);

    return attr;
  };

  const homePageAttributeProcessing = async (attr: AttributeFile): Promise<AttributeFile> => {
    const imageFieldKey = HomePageFields.HeaderImageId;
    const imageFileId = attr.data[imageFieldKey];
    const targetDrive = GetTargetDriveFromProfileId(attr.profileId);

    await confirmDependencyAcl(attr.acl, targetDrive, imageFileId);

    return attr;
  };

  // Externals
  const fetchData = async (profileId?: string, attributeId?: string) => {
    if (!profileId || !attributeId) {
      return null;
    }
    const foundAttribute = await getAttribute(dotYouClient, profileId, attributeId);

    return foundAttribute || null;
  };

  const saveData = async (attribute: AttributeFile) => {
    let toSaveAttr: AttributeFile | undefined;

    switch (attribute.type) {
      case BuiltInAttributes.Name:
        toSaveAttr = nameAttributeProcessing(attribute);
        break;
      case BuiltInAttributes.Photo:
        toSaveAttr = await photoAttributeProcessing(attribute);
        break;
      case HomePageAttributes.HomePage:
        toSaveAttr = await homePageAttributeProcessing(attribute);
        break;
      default:
        toSaveAttr = attribute;
        break;
    }

    // Don't edit original attribute as it will be used for caching decisions in onSettled
    return await saveAttribute(dotYouClient, {
      ...toSaveAttr,
      acl: attribute.acl ?? { requiredSecurityGroup: SecurityGroupType.Owner },
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
          queryClient.invalidateQueries(getListItemCacheKey(variables));

          publishStaticFiles();
        }, 1000);
      },
    }),
  };
};

export default useAttribute;
