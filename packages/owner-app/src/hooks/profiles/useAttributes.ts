import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AttributeFile,
  getProfileAttributes,
  removeAttribute,
} from '@youfoundation/js-lib/profile';
import useAuth from '../auth/useAuth';
import { AttributeDefinition, AttributeDefinitions } from './AttributeDefinitions';

export interface AttributeVm extends AttributeFile {
  typeDefinition: AttributeDefinition;
}

const useAttributes = ({ profileId, sectionId }: { profileId?: string; sectionId?: string }) => {
  const dotYouClient = useAuth().getDotYouClient();

  const queryClient = useQueryClient();

  const fetchData = async (profileId: string, sectionId: string) => {
    if (!profileId || !sectionId) {
      return;
    }

    const foundAttributes = await getProfileAttributes(
      dotYouClient,
      profileId,
      sectionId,
      100 // TODO: Should we page this properly, or how many profile attributes do we expect as normal?
    );

    return foundAttributes.map((attr) => {
      return {
        ...attr,
        typeDefinition: Object.values(AttributeDefinitions).find((def) => {
          return def.type === attr.type;
        }),
      } as AttributeVm;
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

    const foundAttributes = await getProfileAttributes(dotYouClient, profileId, sectionId, 100);

    return await Promise.all(
      foundAttributes.map(
        async (attr) => attr?.fileId && removeAttribute(dotYouClient, profileId, attr.fileId)
      )
    );
  };

  return {
    fetch: useQuery(
      ['attributes', profileId, sectionId],
      () => fetchData(profileId as string, sectionId as string),
      {
        refetchOnWindowFocus: false,
        enabled: !!profileId && !!sectionId,
      }
    ),
    removeAttributes: useMutation(removeAttributes, {
      onError: (err) => {
        console.error(err);
      },
      onSettled: (data, err, variables) => {
        queryClient.invalidateQueries(['attributes', variables.profileId, variables.sectionId]);
      },
    }),
  };
};

export default useAttributes;
