import {
  COMMUNITY_ROOT_PATH,
  Sidenav,
  ErrorBoundary,
  t,
  ActionGroup,
  getOdinIdColor,
  Image,
} from '@homebase-id/common-app';
import { RadioTower, MagnifyingGlass, Plus, Loader, Ellipsis } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useState } from 'react';
import { useMatch, useParams, useNavigate, Link } from 'react-router-dom';
import { useCommunities } from '../../hooks/community/useCommunities';
import {
  COMMUNITY_DEF_PROFILE_KEY,
  CommunityDefinition,
  getTargetDriveFromCommunityId,
} from '../../providers/CommunityDefinitionProvider';

export const CommunitiesNav = ({ togglePin }: { togglePin: (newVal?: boolean) => void }) => {
  const isReactNative = window.localStorage.getItem('client_type')?.startsWith('react-native');

  const rootChatMatch = useMatch({ path: COMMUNITY_ROOT_PATH });
  const communityHomeChatMatch = useMatch({
    path: `${COMMUNITY_ROOT_PATH}/:odinKey/:communityKey`,
    end: true,
  });
  const isRoot = !!rootChatMatch || !!communityHomeChatMatch;
  const isActive = !!rootChatMatch;

  return (
    <>
      {!isReactNative ? <Sidenav disablePinning={true} hideMobileDrawer={!isRoot} /> : null}
      <div
        className={`${isActive ? 'translate-x-full' : 'translate-x-0'} fixed bottom-0 left-[-100%] top-0 z-[1] flex h-[100dvh] w-full flex-shrink-0 flex-col bg-page-background transition-transform lg:relative lg:left-0 lg:max-w-[4rem] lg:translate-x-0`}
      >
        <ErrorBoundary>
          <div className="absolute inset-0 flex flex-grow flex-col md:pl-[calc(env(safe-area-inset-left)+4.3rem)] lg:items-center lg:pl-0">
            <div className="flex flex-row items-center gap-2 px-4 pb-2 pt-4 md:static">
              <RadioTower className="h-7 w-7" />
              <span className="lg:hidden">{t('Homebase Community')}</span>
            </div>
            <CommunitiesList togglePin={togglePin} />
          </div>
        </ErrorBoundary>
      </div>
    </>
  );
};

const CommunitiesList = ({ togglePin }: { togglePin: (newVal?: boolean) => void }) => {
  const [isEnableDiscovery, setIsEnableDiscovery] = useState(false);
  const {
    data: communities,
    isFetched,
    refetch: refetchCommunities,
    isRefetching: isRefetchingCommunities,
  } = useCommunities(isEnableDiscovery).all;
  const { communityKey: activeCommunityId } = useParams();

  const navigate = useNavigate();

  if (!isFetched) return null;

  return (
    <>
      {communities?.map((conversation) => (
        <CommunityListItem
          key={conversation.fileId}
          community={conversation}
          isActive={stringGuidsEqual(activeCommunityId, conversation.fileMetadata.appData.uniqueId)}
          togglePin={togglePin}
        />
      ))}

      <div className={`px-2 py-2`}>
        <ActionGroup
          options={[
            {
              label: 'Discover accessible communities',
              onClick: () => {
                setIsEnableDiscovery(true);

                setTimeout(() => refetchCommunities(), 100);
              },
              icon: MagnifyingGlass,
            },
            {
              label: 'Create a new community',
              onClick: () => navigate(`${COMMUNITY_ROOT_PATH}/new`),
              icon: Plus,
            },
          ]}
          type={'mute'}
          size={'none'}
          className={`flex w-full items-center justify-center rounded-2xl p-[0.606rem] lg:aspect-square`}
        >
          {isRefetchingCommunities && isEnableDiscovery ? (
            <Loader className="h-6 w-6" />
          ) : (
            <Ellipsis className="h-6 w-6" />
          )}
        </ActionGroup>
      </div>
    </>
  );
};

const CommunityListItem = ({
  community,
  isActive,
  togglePin,
}: {
  community: HomebaseFile<CommunityDefinition>;
  isActive: boolean;
  togglePin: (newVal?: boolean) => void;
}) => {
  const communityImage = community.fileMetadata.payloads?.find((p) =>
    p.key.includes(COMMUNITY_DEF_PROFILE_KEY)
  );
  const targetDrive = getTargetDriveFromCommunityId(
    community.fileMetadata.appData.uniqueId as string
  );
  return (
    <div className={`w-full px-2 py-2 ${isActive ? 'bg-primary/20' : ''}`}>
      <Link
        to={`${COMMUNITY_ROOT_PATH}/${community.fileMetadata.senderOdinId}/${community.fileMetadata.appData.uniqueId}`}
        className="flex aspect-auto flex-row items-center gap-4 rounded-lg rounded-l-2xl border bg-background lg:block lg:aspect-square lg:rounded-none lg:border-0 lg:bg-transparent"
        onClick={(e) => {
          if (isActive) {
            togglePin();
            e.stopPropagation();
            e.preventDefault();
            return;
          } else {
            togglePin(true);
          }
        }}
      >
        <span
          className="flex aspect-square w-16 items-center justify-center overflow-hidden rounded-2xl hover:shadow-md lg:w-full"
          style={
            !communityImage
              ? {
                  backgroundColor: getOdinIdColor(community.fileMetadata.appData.content.title)
                    .darkTheme,
                }
              : undefined
          }
        >
          {communityImage ? (
            <Image
              className="h-full w-full"
              fileId={community.fileId}
              fileKey={communityImage.key}
              targetDrive={targetDrive}
              previewThumbnail={
                community.fileMetadata.appData.previewThumbnail || communityImage.previewThumbnail
              }
              fit="cover"
            />
          ) : (
            <span className="p-2 text-lg uppercase leading-none text-white">
              {community.fileMetadata.appData.content.title.slice(0, 2)}
            </span>
          )}
        </span>

        <span className="text-lg lg:hidden">{community.fileMetadata.appData.content.title}</span>
      </Link>
    </div>
  );
};
