import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProfileDefinitions,
  ProfileDefinition,
  removeProfileDefinition,
  saveProfileDefinition,
} from '@homebase-id/js-lib/profile';
import { slugify } from '@homebase-id/js-lib/helpers';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export interface ProfileDefinitionVm extends ProfileDefinition {
  slug: string;
}

export const useProfiles = (disabled?: boolean) => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

  const fetchAll = async () => {
    const definitions = (await getProfileDefinitions(dotYouClient))
    const mappedDefinitions = definitions
      .map((def) => {
        return {
          ...def,
          slug: slugify(def.name),
        } as ProfileDefinitionVm;
      })
      ?.sort((profileA, profileB) => profileA.name.localeCompare(profileB.name));
    if (!mappedDefinitions.length) {
      return;
    }
    return mappedDefinitions;

  };

  const saveProfile = async (profileDef: ProfileDefinition) => {
    return await saveProfileDefinition(dotYouClient, profileDef);
  };

  const removeProfile = async (profileId: string) => {
    return await removeProfileDefinition(dotYouClient, profileId);
  };

  return {
    fetchProfiles: useQuery({
      queryKey: ['profiles'],
      queryFn: fetchAll,
      staleTime: 1000 * 60 * 60, // 1 hour
      enabled: !disabled,

    }),
    saveProfile: useMutation({
      mutationFn: saveProfile,
      onMutate: async (newProfile) => {
        await queryClient.cancelQueries({ queryKey: ['profiles'] });

        const previousProfiles: ProfileDefinitionVm[] | undefined = queryClient.getQueryData([
          'profiles',
        ]);
        const newProfiles = previousProfiles?.map((profile) =>
          profile.profileId === newProfile.profileId
            ? ({ ...newProfile, slug: slugify(newProfile.name) } as ProfileDefinitionVm)
            : profile
        );

        queryClient.setQueryData(['profiles'], newProfiles);

        return { previousProfiles, newProfile };
      },
      onError: (err, newProfile, context) => {
        console.error(err);

        queryClient.setQueryData(['profiles'], context?.previousProfiles);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['profiles'] });
      },
    }),
    removeProfile: useMutation({
      mutationFn: removeProfile,
      onMutate: async (profileId) => {
        await queryClient.cancelQueries({ queryKey: ['profiles'] });

        const previousProfiles: ProfileDefinitionVm[] | undefined = queryClient.getQueryData([
          'profiles',
        ]);
        const newProfiles = previousProfiles?.filter((profile) => profile.profileId !== profileId);

        queryClient.setQueryData(['profiles'], newProfiles);

        return { previousProfiles };
      },
      onError: (err, toRemoveProfileId, context) => {
        console.error(err);

        queryClient.setQueryData(['profiles'], context?.previousProfiles);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['profiles'] });
      },
    }),
  };
};
