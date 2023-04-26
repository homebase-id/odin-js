import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiType,
  DotYouClient,
  getProfileSections,
  ProfileSection,
  removeProfileSection,
  saveProfileSection,
} from '@youfoundation/js-lib';
import useAuth from '../auth/useAuth';
import useAttributes from './useAttributes';

const useProfileSections = ({ profileId }: { profileId?: string }) => {
  const queryClient = useQueryClient();
  const { getSharedSecret } = useAuth();
  const { mutateAsync: removeAttributes } = useAttributes({}).removeAttributes;

  const dotYouClient = new DotYouClient({ api: ApiType.Owner, sharedSecret: getSharedSecret() });

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
    fetchAll: useQuery(['profileSections', profileId], () => fetchSections({ profileId }), {
      refetchOnWindowFocus: false,
    }),
    save: useMutation(saveSection, {
      onMutate: async ({ profileId, profileSection: newSection }) => {
        await queryClient.cancelQueries(['profileSections', profileId]);

        const previousSections: ProfileSection[] = queryClient.getQueryData([
          'profileSections',
          profileId,
        ]);
        const newSections = previousSections?.map((section) =>
          section.sectionId === newSection.sectionId ? newSection : section
        );

        queryClient.setQueryData(['profileSections', profileId], newSections);

        return { previousSections, newSection };
      },
      onError: (err, newData, context) => {
        console.error(err);

        queryClient.setQueryData(['profileSections', newData.profileId], context.previousSections);
      },
      onSettled: (data) => {
        queryClient.invalidateQueries(['profileSections', data.profileId]);
      },
    }),
    remove: useMutation(removeSection, {
      onMutate: async ({ profileId, profileSection: toRemoveSection }) => {
        await queryClient.cancelQueries(['profileSections', profileId]);

        const previousSections: ProfileSection[] = queryClient.getQueryData([
          'profileSections',
          profileId,
        ]);
        const newSections = previousSections?.filter(
          (section) => section.sectionId !== toRemoveSection.sectionId
        );

        queryClient.setQueryData(['profileSections', profileId], newSections);

        return { previousSections, toRemoveSection };
      },
      onError: (err, newData, context) => {
        console.error(err);

        queryClient.setQueryData(['profileSections', newData.profileId], context.previousSections);
      },
      onSettled: (data, err, variables) => {
        queryClient.invalidateQueries(['profileSections', variables.profileId]);
      },
    }),
  };
};

export default useProfileSections;
