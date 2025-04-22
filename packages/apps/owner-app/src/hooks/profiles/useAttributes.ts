import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Attribute, getProfileAttributes } from '@homebase-id/js-lib/profile';
import { AttributeDefinition, AttributeDefinitions } from './AttributeDefinitions';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import { removeProfileAttribute } from '../../provider/profile/AttributeData/ManageAttributeProvider';
import { useOdinClientContext } from '@homebase-id/common-app';

export interface AttributeVm extends Attribute {
  typeDefinition?: AttributeDefinition;
}

export const useAttributes = ({
  profileId,
  sectionId,
}: {
  profileId?: string;
  sectionId?: string;
}) => {
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();

  const fetchData = async (profileId: string, sectionId: string) => {
    if (!profileId || !sectionId) return;

    const foundAttributes = await getProfileAttributes(
      odinClient,
      profileId,
      sectionId,
      undefined,
      200 // TODO: Should we page this properly, or how many profile attributes do we expect being "normal"?
    );

    return foundAttributes.map((attr) => {
      return {
        ...attr,
        fileMetadata: {
          ...attr.fileMetadata,
          appData: {
            ...attr.fileMetadata.appData,
            content: attr.fileMetadata.appData.content
              ? {
                ...attr.fileMetadata.appData.content,
                typeDefinition: Object.values(AttributeDefinitions).find((def) => {
                  return def.type === attr.fileMetadata.appData.content?.type;
                }),
              }
              : undefined,
          },
        },
      } as HomebaseFile<AttributeVm | undefined>;
    });
  };

  const removeAttributes = async ({
    profileId,
    sectionId,
  }: {
    profileId: string;
    sectionId: string;
  }) => {
    if (!profileId || !sectionId) {
      return;
    }

    const foundAttributes = await getProfileAttributes(
      odinClient,
      profileId,
      sectionId,
      undefined,
      100
    );

    return await Promise.all(
      foundAttributes.map(
        async (attr) => attr?.fileId && removeProfileAttribute(odinClient, profileId, attr.fileId)
      )
    );
  };

  return {
    fetch: useQuery({
      queryKey: ['attributes', profileId, sectionId],
      queryFn: () => fetchData(profileId as string, sectionId as string),
      refetchOnWindowFocus: false,
      enabled: !!profileId && !!sectionId,
    }),
    removeAttributes: useMutation({
      mutationFn: removeAttributes,
      onError: (err) => {
        console.error(err);
      },
      onSettled: (data, err, variables) => {
        invalidateAttributes(queryClient, variables.profileId, variables.sectionId);
      },
    }),
  };
};

export const invalidateAttributes = (
  queryClient: QueryClient,
  profileId?: string,
  sectionId?: string
) => {
  queryClient.invalidateQueries({
    queryKey: ['attributes', profileId, sectionId].filter(Boolean),
    exact: !!profileId && !!sectionId,
  });
};

export const updateCacheAttributes = (
  queryClient: QueryClient,
  profileId: string,
  sectionId: string,
  transformFn: (
    attributes: HomebaseFile<AttributeVm>[]
  ) => (HomebaseFile<AttributeVm> | NewHomebaseFile<AttributeVm>)[] | undefined
) => {
  const currentData = queryClient.getQueryData<HomebaseFile<AttributeVm>[]>([
    'attributes',
    profileId,
    sectionId,
  ]);
  if (!currentData) return;

  const updatedData = transformFn(currentData);
  if (!updatedData) return;
  queryClient.setQueryData<(HomebaseFile<AttributeVm> | NewHomebaseFile<AttributeVm>)[]>(
    ['attributes', profileId, sectionId],
    updatedData
  );

  return currentData;
};
