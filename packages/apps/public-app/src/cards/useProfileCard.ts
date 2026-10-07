import { useQuery } from '@tanstack/react-query';
import { useDotYouClientContext } from '@homebase-id/common-app';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  getProfileAttributes,
} from '@homebase-id/js-lib/profile';
import { pickCard, type PickedCard } from './pickCard';

// the public card plus every circle card the viewer can see
const PROFILE_CARD_PAGE_SIZE = 100;

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
          [BuiltInAttributes.ProfileCard],
          PROFILE_CARD_PAGE_SIZE
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
