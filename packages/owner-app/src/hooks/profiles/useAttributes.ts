import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Attribute, getProfileAttributes } from '@homebase-id/js-lib/profile';
import { useAuth } from '../auth/useAuth';
import { AttributeDefinition, AttributeDefinitions } from './AttributeDefinitions';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { removeProfileAttribute } from '../../provider/profile/AttributeData/ManageAttributeProvider';

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
  const dotYouClient = useAuth().getDotYouClient();
  const queryClient = useQueryClient();

  const fetchData = async (profileId: string, sectionId: string) => {
    if (!profileId || !sectionId) return;

    const foundAttributes = await getProfileAttributes(
      dotYouClient,
      profileId,
      sectionId,
      undefined,
      100 // TODO: Should we page this properly, or how many profile attributes do we expect as normal?
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
      dotYouClient,
      profileId,
      sectionId,
      undefined,
      100
    );

    return await Promise.all(
      foundAttributes.map(
        async (attr) => attr?.fileId && removeProfileAttribute(dotYouClient, profileId, attr.fileId)
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
        queryClient.invalidateQueries({
          queryKey: ['attributes', variables.profileId, variables.sectionId],
        });
      },
    }),
  };
};
