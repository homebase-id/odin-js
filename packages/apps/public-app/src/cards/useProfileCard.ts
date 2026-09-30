import { useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  getProfileAttributes,
} from '@homebase-id/js-lib/profile';
import { pickCard, type PickedCard } from './pickCard';

export const useProfileCard = () => {
  const dotYouClient = useDotYouClientContext();

  return useQuery({
    queryKey: ['profile-card'],
    queryFn: async (): Promise<PickedCard | null> => {
      try {
        const files = await getProfileAttributes(
          dotYouClient,
          BuiltInProfiles.StandardProfileId,
          undefined,
          [BuiltInAttributes.ProfileCard]
        );
        return pickCard(files);
      } catch (e) {
        console.error('failed to fetch profile card', e);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};
