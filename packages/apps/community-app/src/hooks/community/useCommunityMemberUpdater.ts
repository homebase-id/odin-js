import { useCircle, useOdinClientContext } from '@homebase-id/common-app';
import { useCommunity } from './useCommunity';
import { useEffect } from 'react';

export const useCommunityMemberUpdater = (
  odinId: string | undefined,
  communityId: string | undefined
) => {
  const { data: community } = useCommunity({ odinId, communityId }).fetch;
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();

  const isAdmin = community?.fileMetadata.originalAuthor === loggedOnIdentity;

  const communityCircleId = community?.fileMetadata.appData.content.acl.circleIdList?.[0];
  const { data: members, isFetched: membersFetched } = useCircle({
    circleId: isAdmin ? communityCircleId : undefined,
  }).fetchMembers;

  const { mutate: saveCommunity } = useCommunity().save;

  useEffect(() => {
    if (!membersFetched || !community || !isAdmin || !communityCircleId) return;

    const circleMembers = [
      ...(members?.map((member) => member.domain) || []),
      loggedOnIdentity,
    ].filter(Boolean) as string[];
    const communityMembers = community.fileMetadata.appData.content.members || [];

    if (
      circleMembers.length !== communityMembers.length ||
      !circleMembers.every((member) => communityMembers.includes(member)) ||
      !communityMembers.every((member) => circleMembers.includes(member))
    ) {
      saveCommunity({
        ...community,
        fileMetadata: {
          ...community.fileMetadata,
          appData: {
            ...community.fileMetadata.appData,
            content: {
              ...community.fileMetadata.appData.content,
              members: circleMembers,
            },
          },
        },
      });
    }
  }, [members, community]);
};
