import { useRef } from 'react';
import { useMatch, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import IdentityIFollowEditDialog from '../../components/Dialog/IdentityIFollowEditDialog/IdentityIFollowEditDialog';
import {
  ActionGroup,
  Block,
  useIntersection,
  useFollowerInfinite,
  useFollowingInfinite,
  SubtleMessage,
  IdentityTeaser,
} from '@youfoundation/common-app';
import { Pencil } from '@youfoundation/common-app';
import { Persons } from '@youfoundation/common-app';
import { Times } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import useIdentityIFollow from '../../hooks/follow/useIdentityIFollow';
import { Eye } from '@youfoundation/common-app';
import IdentityThatFollowsDialog from '../../components/Dialog/IdentityIFollowEditDialog/IdentityThatFollowsDialog';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import Submenu from '../../components/SubMenu/SubMenu';
import { useConnectionActions } from '../../hooks/connections/useConnectionActions';

const Follow = () => {
  const followersMatch = useMatch({ path: 'owner/follow/followers/*' });

  return (
    <>
      <PageMeta icon={Persons} title={'Following & Followers'} />
      <Submenu
        items={[
          {
            title: `People that I follow`,
            path: `/owner/follow/following`,
          },
          {
            title: `People that follow me`,
            path: `/owner/follow/followers`,
          },
        ]}
        className="-mt-6 mb-6"
      />

      {followersMatch ? <Followers /> : <Following />}
    </>
  );
};

const Following = () => {
  const navigate = useNavigate();
  const { toFollowKey } = useParams();

  const {
    fetch: { data: followingPages, isLoading: isFollowingLoading, hasNextPage, fetchNextPage },
  } = useFollowingInfinite({ pageSize: 10 });
  const following = followingPages?.pages?.flatMap((page) => page?.results);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useIntersection(
    hasNextPage ? loadMoreRef : undefined,
    () => {
      fetchNextPage();
    },
    true
  );

  const [searchParams] = useSearchParams();
  const channelsFromQueryString = searchParams.get('chnl')?.split(',') || undefined;

  return (
    <>
      {isFollowingLoading ? null : following?.length ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {following.map((odinId) => {
            if (!odinId) return null;
            return (
              <FollowingIdentity
                odinId={odinId}
                key={odinId}
                onEdit={() => navigate(`/owner/follow/following/${odinId}`)}
              />
            );
          })}
          <div ref={loadMoreRef} key="load-more" className="h-1 w-full"></div>
        </div>
      ) : (
        <SubtleMessage>{t("You're not following anyone")}</SubtleMessage>
      )}

      {toFollowKey ? (
        <IdentityIFollowEditDialog
          odinId={toFollowKey}
          isOpen={!!toFollowKey}
          onConfirm={() => navigate(`/owner/follow/following`)}
          onCancel={() => navigate(`/owner/follow/following`)}
          defaultValues={toFollowKey ? channelsFromQueryString : undefined}
        />
      ) : null}
    </>
  );
};

const Followers = () => {
  const {
    data: followersPages,
    isLoading: isFollowersLoading,
    hasNextPage,
    fetchNextPage,
  } = useFollowerInfinite({ pageSize: 10 });
  const followers = followersPages?.pages?.flatMap((page) => page?.results);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useIntersection(
    hasNextPage ? loadMoreRef : undefined,
    () => {
      fetchNextPage();
    },
    true
  );

  const { followerKey } = useParams();
  const navigate = useNavigate();

  return (
    <>
      {isFollowersLoading ? (
        <></>
      ) : followers?.length ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {followers.map((odinId) => {
            if (!odinId) return null;
            return (
              <FollowIdentity
                odinId={odinId}
                key={odinId}
                onEdit={() => navigate(`/owner/follow/followers/${odinId}`)}
              />
            );
          })}
          <div ref={loadMoreRef} key="load-more" className="h-1 w-full"></div>
        </div>
      ) : (
        <SubtleMessage>{t("You don't have any followers")}</SubtleMessage>
      )}
      {followerKey ? (
        <IdentityThatFollowsDialog
          odinId={followerKey}
          isOpen={!!followerKey}
          onConfirm={() => navigate(`/owner/follow/followers`)}
          onCancel={() => navigate(`/owner/follow/followers`)}
        />
      ) : null}
    </>
  );
};

const FollowIdentity = ({ odinId, onEdit }: { odinId: string; onEdit: () => void }) => {
  const { mutate: block } = useConnectionActions().block;

  return (
    <>
      <IdentityTeaser key={odinId} odinId={odinId} size="sm">
        <ActionGroup
          type="mute"
          size="square"
          options={[
            {
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              },
              icon: Eye,
              label: t('Details'),
            },
            {
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                block(odinId);
              },
              confirmOptions: {
                title: t('Block'),
                body: `${t('Are you sure you want to stop')} "${odinId}" ${t(
                  'from following you by blocking them'
                )}?`,
                buttonText: t('Block'),
              },
              icon: Block,
              label: t('Block'),
            },
          ]}
          className="text-sm"
        >
          ...
        </ActionGroup>
      </IdentityTeaser>
    </>
  );
};

const FollowingIdentity = ({ odinId, onEdit }: { odinId: string; onEdit: () => void }) => {
  const { mutate: unfollow } = useIdentityIFollow({ odinId }).unfollow;

  return (
    <>
      <IdentityTeaser key={odinId} odinId={odinId} size="sm">
        <ActionGroup
          type="mute"
          size="square"
          options={[
            {
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              },
              icon: Pencil,
              label: t('Edit'),
            },
            {
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                unfollow({ odinId });
              },
              confirmOptions: {
                title: t('Unfollow'),
                body: `${t('Are you sure you want to unfollow')} "${odinId}"?`,
                buttonText: t('Unfollow'),
              },
              icon: Times,
              label: t('Unfollow'),
            },
          ]}
          className="text-sm"
        >
          ...
        </ActionGroup>
      </IdentityTeaser>
    </>
  );
};

export default Follow;
