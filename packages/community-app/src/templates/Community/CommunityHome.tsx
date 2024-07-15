import { useParams, useMatch } from 'react-router-dom';

import { CommunityDetail } from './CommunityDetail';

import { ROOT_PATH } from '../../app/App';
import {
  ActionLink,
  COMMUNITY_APP_ID,
  ErrorBoundary,
  ExtendPermissionDialog,
  Plus,
  RadioTower,
  Sidenav,
  t,
  useRemoveNotifications,
} from '@youfoundation/common-app';
import { drives, permissions } from '../../hooks/auth/useAuth';
import { Helmet } from 'react-helmet-async';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useCommunities } from '../../hooks/community/useCommunities';
import { NewCommunity } from './CommunityNew';

export const COMMUNITY_ROOT = ROOT_PATH;

export const CommunityHome = () => {
  const { communityKey } = useParams();

  const newCommunity = useMatch({ path: `${COMMUNITY_ROOT}/new` });
  const isCreateNew = !!newCommunity;

  // const isOnline = useLiveCommunityProcessor(); // => Probablay move to CommunityDetail as it needs to connect on different drives
  useRemoveNotifications({ appId: COMMUNITY_APP_ID });

  return (
    <>
      <Helmet>
        <title>Homebase | Community</title>
      </Helmet>

      <ExtendPermissionDialog
        appName={t('Homebase Community')}
        appId={COMMUNITY_APP_ID}
        drives={drives}
        permissions={permissions}
      />
      <div className={`flex h-[100dvh] w-full flex-row overflow-hidden`}>
        <CommunitySideNav isOnline={false} />
        <div className="h-full w-full flex-grow bg-background">
          {isCreateNew ? <NewCommunity /> : <CommunityDetail communityId={communityKey} />}
        </div>
      </div>
    </>
  );
};

const CommunitySideNav = ({ isOnline }: { isOnline: boolean }) => {
  const { communityKey } = useParams();

  const rootChatMatch = useMatch({ path: COMMUNITY_ROOT });
  const isRoot = !!rootChatMatch;

  const isActive = isRoot;

  return (
    <>
      <Sidenav disablePinning={true} hideMobileDrawer={!isRoot} />
      <div
        className={`${isActive ? 'translate-x-full' : 'translate-x-0'} fixed bottom-0 left-[-100%] top-0 flex h-[100dvh] w-full flex-shrink-0 flex-col bg-page-background transition-transform lg:relative lg:left-0 lg:max-w-[4rem] lg:translate-x-0`}
      >
        <ErrorBoundary>
          <CommunitiesSidebar activeCommunityId={communityKey} />
        </ErrorBoundary>
      </div>
    </>
  );
};

export const CommunitiesSidebar = ({
  activeCommunityId,
}: {
  activeCommunityId: string | undefined;
}) => {
  const { data: communities } = useCommunities().all;

  return (
    <ErrorBoundary>
      <div className="absolute inset-0 flex flex-grow flex-row flex-wrap overflow-auto lg:flex-col lg:items-center">
        <div className="px-2 py-2">
          <ActionLink href={COMMUNITY_ROOT} type="mute" size={'none'} className="px-2 py-2 pb-0">
            <RadioTower className="h-7 w-7" />
          </ActionLink>
        </div>
        <CommunitiesList
          communities={
            communities?.filter(
              (community) =>
                community.fileMetadata.appData.archivalStatus !== 2 ||
                community.fileMetadata.appData.uniqueId === activeCommunityId
            ) || []
          }
          activeCommunityId={activeCommunityId}
        />
      </div>
    </ErrorBoundary>
  );
};

const CommunitiesList = ({
  communities,
  activeCommunityId,
}: {
  communities: HomebaseFile<CommunityDefinition>[];
  activeCommunityId: string | undefined;
}) => {
  const newHref = `${COMMUNITY_ROOT}/new`;
  const newCommunity = useMatch({ path: newHref });
  const isCreateNew = !!newCommunity;

  return (
    <>
      {communities?.map((conversation) => (
        <CommunityListItem
          key={conversation.fileId}
          community={conversation}
          isActive={stringGuidsEqual(activeCommunityId, conversation.fileMetadata.appData.uniqueId)}
        />
      ))}

      <div className={`px-2 py-2 ${isCreateNew ? 'bg-primary/20' : ''}`}>
        <ActionLink
          href={newHref}
          type={communities?.length ? 'secondary' : 'primary'}
          size={'none'}
          className={`flex aspect-square w-full items-center justify-center rounded-2xl p-[0.606rem] hover:shadow-md`}
        >
          <Plus className="h-6 w-6" />
        </ActionLink>
      </div>
    </>
  );
};

const CommunityListItem = ({
  community,
  isActive,
}: {
  community: HomebaseFile<CommunityDefinition>;
  isActive: boolean;
}) => {
  return (
    <div className={`px-2 py-2 ${isActive ? 'bg-primary/20' : ''}`}>
      <ActionLink
        href={`${COMMUNITY_ROOT}/${community.fileMetadata.appData.uniqueId}`}
        className={`aspect-square w-full rounded-2xl p-4 uppercase hover:shadow-md`}
      >
        {community.fileMetadata.appData.content.title.slice(0, 2)}
      </ActionLink>
    </div>
  );
};
