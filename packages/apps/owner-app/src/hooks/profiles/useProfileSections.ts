import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProfileSections,
  ProfileSection,
  removeProfileSection,
  saveProfileSection,
} from '@homebase-id/js-lib/profile';
import { useAuth } from '../auth/useAuth';
import { useAttributes } from './useAttributes';

export const useProfileSections = ({ profileId }: { profileId?: string }) => {
  const queryClient = useQueryClient();
  const { mutateAsync: removeAttributes } = useAttributes({}).removeAttributes;
  const dotYouClient = useAuth().getDotYouClient();

  const fetchSections = async ({ profileId }: { profileId: string }) => {
    if (!profileId) {
      return [];
    }
    const definitions = await getProfileSections(dotYouClient, profileId);

    return definitions;
  };

  const saveSection = async ({
    profileId,
    profileSection,
  }: {
    profileId: string;
    profileSection: ProfileSection;
  }) => {
    await saveProfileSection(dotYouClient, profileId, profileSection);
    return { profileId, profileSection };
  };

  const removeSection = async ({
    profileId,
    profileSection,
  }: {
    profileId: string;
    profileSection: ProfileSection;
  }) => {
    await removeAttributes({ profileId: profileId, sectionId: profileSection.sectionId });

    return await removeProfileSection(dotYouClient, profileId, profileSection.sectionId);
  };

  return {
    fetchAll: useQuery({
      queryKey: ['profileSections', profileId],
      queryFn: () => fetchSections({ profileId: profileId as string }),

      refetchOnWindowFocus: false,
    }),
    save: useMutation({
      mutationFn: saveSection,
      onMutate: async ({ profileId, profileSection: newSection }) => {
        const previousSections = updateCacheProfileSections(queryClient, profileId, (data) =>
          data?.map((section) =>
            section.sectionId === newSection.sectionId ? newSection : section
          )
        );

        return { previousSections, newSection };
      },
      onError: (err, newData, context) => {
        console.error(err);

        updateCacheProfileSections(queryClient, newData.profileId, () => context?.previousSections);
      },
      onSettled: (data) => {
        invalidateProfileSections(queryClient, data?.profileId);
      },
    }),
    remove: useMutation({
      mutationFn: removeSection,
      onMutate: async ({ profileId, profileSection: toRemoveSection }) => {
        const previousSections = updateCacheProfileSections(queryClient, profileId, (data) =>
          data.filter((section) => section.sectionId !== toRemoveSection.sectionId)
        );
        return { previousSections, toRemoveSection };
      },
      onError: (err, newData, context) => {
        console.error(err);

        updateCacheProfileSections(queryClient, newData.profileId, () => context?.previousSections);
      },
      onSettled: (_data, _err, variables) => {
        invalidateProfileSections(queryClient, variables.profileId);
      },
    }),
  };
};

export const invalidateProfileSections = (queryClient: QueryClient, profileId?: string) => {
  queryClient.invalidateQueries({ queryKey: ['profileSections', profileId] });
};

export const updateCacheProfileSections = (
  queryClient: QueryClient,
  profileId: string,
  transformFn: (sections: ProfileSection[]) => ProfileSection[] | undefined
) => {
  const currentData = queryClient.getQueryData<ProfileSection[]>(['profileSections', profileId]);
  if (!currentData) return;

  const newData = transformFn(currentData);
  queryClient.setQueryData(['profileSections', profileId], newData);

  return currentData;
};
